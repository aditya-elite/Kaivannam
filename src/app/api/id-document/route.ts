import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decodeDataUrl } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import { runIdOcr } from "@/lib/id-ocr";
import { signDocumentPayload, getServerPublicKeyPem } from "@/lib/server-signing";
import { getLedger } from "@/lib/ledger";
import { putPrivate } from "@/lib/private-store";
import { docPaths } from "@/lib/supabase/storage";

// tesseract.js + node crypto need the Node runtime, not edge.
export const runtime = "nodejs";

/**
 * POST /api/id-document — the ID-document pipeline.
 *
 *   auth → hash(image) → OCR parse → sign{fields,hash,ts} → store(private) →
 *   anchor(hash) → persist record.
 *
 * The raw image + extracted fields + signed certificate go to PRIVATE storage
 * (a private Supabase bucket when configured, else the local private store).
 * ONLY the SHA-256 image hash is anchored on the local ledger — never the raw
 * image or PII.
 *
 * Failure handling distinguishes two very different cases:
 *   • the OCR ENGINE could not run (e.g. no trained data offline) — an
 *     infrastructure issue, NOT a bad document. We still hash, sign, anchor and
 *     store; fields are left empty and the record stays PENDING for manual
 *     review. The digital signature + tamper-evidence still hold.
 *   • the engine ran but the image is unreadable / not a valid document — that
 *     is REJECTED with a reason, no signature/anchor.
 *
 * This attests Kaivannam processed the document unaltered — it does NOT assert
 * the government ID is genuine (no public Pehchan API). UI copy says
 * "Kaivannam verified" / "document reviewed", never "government-verified".
 */

type Body = { image?: string };

const contentTypeFor = (ext: string) =>
  ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const decoded = body.image ? decodeDataUrl(body.image) : null;
  if (!decoded) return NextResponse.json({ error: "bad_image" }, { status: 400 });

  const artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan) return NextResponse.json({ error: "artisan_required" }, { status: 403 });

  // Step 2 — hash the exact uploaded bytes. This is the value anchored + signed.
  const imageSha256 = sha256(decoded.bytes);

  // Create the record up front so we have a stable id for storage paths and the
  // ledger subject.
  const request = await db.verificationRequest.create({
    data: { artisanId: artisan.id, imageSha256, idDocStatus: "PENDING" },
  });

  const paths = docPaths(artisan.id, request.id, decoded.ext);

  try {
    // Store the raw image privately (kept even on a rejected read, so an admin
    // can look at what was uploaded).
    const img = await putPrivate(decoded.bytes, contentTypeFor(decoded.ext), paths.image);

    // Step 1 — OCR parse.
    const ocr = await runIdOcr(decoded.bytes);

    // Genuine bad document (engine ran, couldn't read it) → REJECTED, no signing.
    if (!ocr.ok && ocr.reason !== "ocr_unavailable") {
      await db.verificationRequest.update({
        where: { id: request.id },
        data: {
          imageBucket: img.bucket,
          imagePath: img.path,
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

    // Either OCR succeeded, or the engine was unavailable (fields unknown but we
    // still sign + anchor the image). Build extracted_data accordingly.
    const ocrOk = ocr.ok;
    const extracted_data = ocrOk
      ? { ...ocr.fields, confidence: ocr.confidence, idChecksumOk: ocr.idChecksumOk }
      : { idNumber: null, name: null, craft: null, region: null, ocrUnavailable: true as const };

    // Step 3 — sign { extracted_data, image_hash, timestamp } with the server key.
    const timestamp = new Date().toISOString();
    const signed = signDocumentPayload({ extracted_data, image_hash: imageSha256, timestamp });

    // The signed certificate (stored privately alongside the image).
    const certificate = {
      version: 1,
      subject: "kaivannam-id-document",
      requestId: request.id,
      artisanId: artisan.id,
      extracted_data,
      image_hash: imageSha256,
      image_path: img.path,
      timestamp,
      signature: signed.signature,
      signingKeyId: signed.signingKeyId,
      publicKeyPem: getServerPublicKeyPem(),
      note:
        "Kaivannam attests it processed and reviewed this document unaltered. " +
        "This is NOT a government verification of the ID number.",
    };
    const cert = await putPrivate(
      Buffer.from(JSON.stringify(certificate, null, 2), "utf8"),
      "application/json",
      paths.certificate,
    );

    // Step 4 — anchor ONLY the image hash on the ledger (same pattern as crafts).
    const receipt = await getLedger().appendDocument(request.id, imageSha256);

    // Persist everything. Stays PENDING until an admin marks it VERIFIED.
    await db.verificationRequest.update({
      where: { id: request.id },
      data: {
        ocrIdNumber: ocrOk ? ocr.fields.idNumber : null,
        ocrName: ocrOk ? ocr.fields.name : null,
        ocrCraft: ocrOk ? ocr.fields.craft : null,
        ocrRegion: ocrOk ? ocr.fields.region : null,
        ocrConfidence: ocrOk ? JSON.stringify(ocr.confidence) : null,
        ocrRawText: ocrOk ? ocr.rawText : null,
        idNumber: ocrOk ? ocr.fields.idNumber : null,
        imageBucket: img.bucket,
        imagePath: img.path,
        certPath: cert.path,
        serverSignature: signed.signature,
        signedPayload: signed.signedPayload,
        signingKeyId: signed.signingKeyId,
        anchorSeq: receipt.seq,
        idDocStatus: "PENDING",
        idDocError: ocrOk ? null : "ocr_unavailable: fields could not be read automatically",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "pending",
      requestId: request.id,
      idNumber: ocrOk ? ocr.fields.idNumber : null,
      ocrUnavailable: !ocrOk,
      anchorSeq: receipt.seq,
      imageHash: imageSha256,
    });
  } catch (e) {
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
