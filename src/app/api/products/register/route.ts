import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, decodeDataUrl } from "@/lib/storage";
import { getLedger } from "@/lib/ledger";
import { newProductId } from "@/lib/ids";
import { sha256 } from "@/lib/hash";
import { computeProductHash, STAGE_ORDER } from "@/lib/product-record";
import { createInitialRecord } from "@/lib/authenticity/record";
import { ensureGenesisOwner } from "@/lib/ownership";
import { lookupGiByNumber } from "@/lib/gi";
import { generateArtisanKeyPair, signScanPayload } from "@/lib/crypto-keys";
import { rupeesToPaise } from "@/lib/money";
import type { Stage } from "@prisma/client";

type StageInput = { photos: string[]; note?: string };
type Body = {
  title: string;
  category: string;
  materials: string;
  storyText?: string;
  hiddenSignature?: string;
  hiddenSignatureHint?: string;
  stages: Record<string, StageInput>;
  // Gate 2 — the product's GI certificate: image + the (OCR-read, user-confirmed)
  // GI number to match against the ingested register.
  giCertImage?: string;
  giNumber?: string;
  // Optional storefront listing.
  priceRupees?: string;
  stock?: string;
  listForSale?: boolean;
};

export async function POST(req: NextRequest) {
  // Auth is enforced HERE — the single point at which registration requires it.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const body = (await req.json()) as Body;

  // ── Server-side validation (client checks are UX only) ──
  if (!body.title?.trim() || !body.category?.trim() || !body.materials?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  for (const stage of STAGE_ORDER) {
    const s = body.stages?.[stage];
    if (!s || !Array.isArray(s.photos) || s.photos.length === 0) {
      // A product CANNOT be sealed until every stage has a photo.
      return NextResponse.json({ error: "stage_incomplete", stage }, { status: 400 });
    }
  }

  // ── GATE 1 — artisan identity. Listing a product requires a Pehchan-verified
  // artisan. The two gates are independent: verifying yourself as an artisan does
  // NOT verify a product, and vice-versa.
  const artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan || !artisan.pehchanVerified) {
    return NextResponse.json({ error: "artisan_unverified" }, { status: 403 });
  }

  // ── GATE 2 — product authenticity. The GI certificate number must match an
  // entry in the ingested GI register.
  if (!body.giNumber?.trim() || !body.giCertImage) {
    return NextResponse.json({ error: "gi_required" }, { status: 400 });
  }
  const giLookup = await lookupGiByNumber(body.giNumber.trim());
  if (!giLookup.entry) {
    return NextResponse.json({ error: "gi_unverified", giNumber: body.giNumber.trim() }, { status: 422 });
  }
  const giCert = decodeDataUrl(body.giCertImage);
  if (!giCert) {
    return NextResponse.json({ error: "bad_gi_image" }, { status: 400 });
  }

  // Store the hidden signature HASHED on the artisan (never stored in the clear,
  // never rendered publicly). Only set/refresh if the artisan provided one.
  if (body.hiddenSignature?.trim()) {
    await db.artisan.update({
      where: { id: artisan.id },
      data: {
        hiddenSignatureHash: sha256(body.hiddenSignature.trim().toLowerCase()),
        hiddenSignatureHint: body.hiddenSignatureHint?.trim() || null,
      },
    });
    artisan.hiddenSignatureHash = sha256(body.hiddenSignature.trim().toLowerCase());
  }

  const storage = getStorage();
  const productId = newProductId();

  // Persist the GI certificate image (Gate 2 evidence, shown on the profile).
  const storedGiCert = await storage.put(giCert.bytes, {
    ext: giCert.ext,
    prefix: `gi-certs/${artisan.id}`,
  });

  // Upload every stage photo, collecting stable URLs. Server stamps timestamps.
  const stagesForRecord: {
    stage: Stage;
    version: number;
    capturedAt: Date;
    photoUrls: string[];
    note: string | null;
  }[] = [];

  for (const stage of STAGE_ORDER) {
    const input = body.stages[stage];
    const urls: string[] = [];
    for (const dataUrl of input.photos) {
      const decoded = decodeDataUrl(dataUrl);
      if (!decoded) continue;
      const stored = await storage.put(decoded.bytes, { ext: decoded.ext, prefix: productId });
      urls.push(stored.url);
    }
    if (urls.length === 0) {
      return NextResponse.json({ error: "stage_incomplete", stage }, { status: 400 });
    }
    stagesForRecord.push({
      stage,
      version: 1,
      capturedAt: new Date(),
      photoUrls: urls,
      note: input.note?.trim() || null,
    });
  }

  // Optional storefront listing.
  const priceInPaise = body.listForSale ? rupeesToPaise(body.priceRupees ?? "") : null;
  const stock = body.listForSale ? Math.max(0, Math.floor(Number(body.stock ?? "0")) || 0) : 0;
  const listedForSale = !!body.listForSale && priceInPaise != null && priceInPaise > 0 && stock > 0;

  // Create product (DRAFT first), then its stage entries. Record the verified GI
  // certificate on the product (Gate 2).
  await db.product.create({
    data: {
      id: productId,
      artisanId: artisan.id,
      title: body.title.trim(),
      materials: body.materials.trim(),
      storyText: body.storyText?.trim() || null,
      category: body.category.trim(),
      status: "DRAFT",
      giNumber: giLookup.entry.giNumber,
      giCertUrl: storedGiCert.url,
      giVerified: true,
      giEntryId: giLookup.entry.id,
      priceInPaise,
      stock,
      listedForSale,
    },
  });
  for (const s of stagesForRecord) {
    await db.stageEntry.create({
      data: {
        productId,
        stage: s.stage,
        version: s.version,
        photoUrls: JSON.stringify(s.photoUrls),
        note: s.note,
        capturedAt: s.capturedAt,
      },
    });
  }

  // ── Seal: compute the content hash, append to the ledger, issue the QR. ──
  const contentHash = await computeProductHash({
    id: productId,
    title: body.title.trim(),
    materials: body.materials.trim(),
    category: body.category.trim(),
    storyText: body.storyText?.trim() || null,
    artisan: {
      id: artisan.id,
      fullName: artisan.fullName,
      craft: artisan.craft,
      region: artisan.region,
    },
    hiddenSignatureHash: artisan.hiddenSignatureHash,
    stages: stagesForRecord,
  });

  await getLedger().append(productId, contentHash);

  // KEY 1 — make sure the artisan has a signing keypair, then sign the dynamic QR
  // payload `${productId}|${sealedAt}` with their private key.
  let privateKeyPem = artisan.signingPrivateKey;
  if (!privateKeyPem || !artisan.signingPublicKey) {
    const pair = generateArtisanKeyPair();
    await db.artisan.update({
      where: { id: artisan.id },
      data: { signingPublicKey: pair.publicKeyPem, signingPrivateKey: pair.privateKeyPem },
    });
    privateKeyPem = pair.privateKeyPem;
  }

  const sealedAt = new Date();
  const signature = signScanPayload(productId, sealedAt.toISOString(), privateKeyPem);

  await db.product.update({
    where: { id: productId },
    data: {
      status: "SEALED",
      contentHash,
      signature,
      qrIssuedAt: sealedAt,
      qrPngUrl: `/api/products/${productId}/qr`,
      sealedAt,
    },
  });

  // ── Two provenance layers, both seeded at seal, both separate from the hash
  //    above (which is Layer 1's fingerprint). createInitialRecord freezes the
  //    v1 authenticity record + its consensus; ensureGenesisOwner writes the
  //    first custody entry (the maker holds it). Neither can alter contentHash. ──
  await createInitialRecord(productId);
  await ensureGenesisOwner(productId);

  return NextResponse.json({ id: productId });
}
