import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decodeDataUrl } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import { runIdOcr } from "@/lib/id-ocr";
import { signDocumentPayload, getServerPublicKeyPem } from "@/lib/server-signing";
import { getLedger } from "@/lib/ledger";
import {
  isStorageConfigured,
  ensurePrivateBucket,
  uploadPrivate,
  docPaths,
  PRIVATE_BUCKET,
} from "@/lib/supabase/storage";

// tesseract.js + node crypto need the Node runtime, not edge.
export const runtime = "nodejs";

/**
 * POST /api/id-document — the ID-document pipeline.
 *
 *   auth → hash(image) → OCR parse → sign{fields,hash,ts} → store(private) →
 *   anchor(hash) → persist record.
 *
 * The raw image + extracted fields + signed certificate go to a PRIVATE Supabase
 * bucket. ONLY the SHA-256 image hash is anchored on the local ledger — never the
 * raw image or PII. If OCR cannot read the document, the record is marked
 * REJECTED with a reason (not silently dropped), and no signature/anchor is made.
 *
 * This attests that Kaivannam processed the document unaltered — it does NOT
 * assert the government ID is genuine (no public Pehchan API). UI copy elsewhere
 * says "Kaivannam verified" / "document reviewed", never "government-verified".
 */

type Body = { image?: string };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Storage is Supabase-only for this feature (private bucket). Fail clearly if
  // it isn't configured rather than write a half-record or leak PII locally.
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const decoded = body.image ? decodeDataUrl(body.image) : null;
  if (!decoded) return NextResponse.json({ error: "bad_image" }, { status: 400 });

  // A registered artisan profile is required to attach the document to.
  const artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan) return NextResponse.json({ error: "artisan_required" }, { status: 403 });

  // Step 2 — hash the exact uploaded bytes. This is the value anchored + signed.
  const imageSha256 = sha256(decoded.bytes);

  // Create the record up front so we have a stable id for storage paths and the
  // ledger subject. Starts PENDING.
  const request = await db.verificationRequest.create({
    data: { artisanId: artisan.id, imageSha256, idDocStatus: "PENDING" },
  });

  const paths = docPaths(artisan.id, request.id, decoded.ext);

  try {
    await ensurePrivateBucket();
    // Store the raw image privately (kept even on OCR failure, so an admin can
    // look at what was uploaded).
    const contentType = decoded.ext === "png" ? "image/png" : decoded.ext === "webp" ? "image/webp" : "image/jpeg";
    await uploadPrivate(paths.image, decoded.bytes, contentType);

    // Step 1 — OCR parse.
    const ocr = await runIdOcr(decoded.bytes);

    if (!ocr.ok) {
      await db.verificationRequest.update({
        where: { id: request.id },
        data: {
          imageBucket: PRIVATE_BUCKET,
          imagePath: paths.image,
          ocrRawText: ocr.rawText ?? null,
          idDocStatus: "REJECTED",
          idDocError: `${ocr.reason}: ${ocr.detail}`,
          processedAt: new Date(),
        },
      });
      return NextResponse.json(
        { status: "rejected", reason: ocr.reason, detail: ocr.detail, requestId: request.id },
        { status: 200 },
      );
    }

    // Step 3 — sign { extracted_data, image_hash, timestamp } with the server key.
    const timestamp = new Date().toISOString();
    const extracted_data = { ...ocr.fields, confidence: ocr.confidence, idChecksumOk: ocr.idChecksumOk };
    const signed = signDocumentPayload({ extracted_data, image_hash: imageSha256, timestamp });

    // The certificate object (image + signature live privately together).
    const certificate = {
      version: 1,
      subject: "kaivannam-id-document",
      requestId: request.id,
      artisanId: artisan.id,
      extracted_data,
      image_hash: imageSha256,
      image_path: paths.image,
      timestamp,
      signature: signed.signature,
      signingKeyId: signed.signingKeyId,
      publicKeyPem: getServerPublicKeyPem(),
      note:
        "Kaivannam attests it processed and reviewed this document unaltered. " +
        "This is NOT a government verification of the ID number.",
    };
    await uploadPrivate(
      paths.certificate,
      Buffer.from(JSON.stringify(certificate, null, 2), "utf8"),
      "application/json",
    );

    // Step 4 — anchor ONLY the image hash on the ledger (same pattern as crafts).
    const receipt = await getLedger().appendDocument(request.id, imageSha256);

    // Persist everything. Stays PENDING until an admin marks it VERIFIED.
    await db.verificationRequest.update({
      where: { id: request.id },
      data: {
        ocrIdNumber: ocr.fields.idNumber,
        ocrName: ocr.fields.name,
        ocrCraft: ocr.fields.craft,
        ocrRegion: ocr.fields.region,
        ocrConfidence: JSON.stringify(ocr.confidence),
        ocrRawText: ocr.rawText,
        idNumber: ocr.fields.idNumber,
        imageBucket: PRIVATE_BUCKET,
        imagePath: paths.image,
        certPath: paths.certificate,
        serverSignature: signed.signature,
        signedPayload: signed.signedPayload,
        signingKeyId: signed.signingKeyId,
        anchorSeq: receipt.seq,
        idDocStatus: "PENDING",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "pending",
      requestId: request.id,
      idNumber: ocr.fields.idNumber,
      anchorSeq: receipt.seq,
      imageHash: imageSha256,
    });
  } catch (e) {
    // Any storage/processing failure → mark rejected with the reason, don't leave
    // a silent half-record.
    await db.verificationRequest.update({
      where: { id: request.id },
      data: {
        idDocStatus: "REJECTED",
        idDocError: "processing_error: " + (e instanceof Error ? e.message : String(e)),
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
