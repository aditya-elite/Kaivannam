import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, decodeDataUrl } from "@/lib/storage";
import { getLedger } from "@/lib/ledger";
import { newProductId } from "@/lib/ids";
import { sha256 } from "@/lib/hash";
import { computeProductHash, STAGE_ORDER } from "@/lib/product-record";
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

  // Ensure the user has an artisan profile (self-declared by default).
  let artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan) {
    artisan = await db.artisan.create({
      data: {
        userId: user.id,
        fullName: user.displayName,
        craft: body.category.trim(),
        region: "Not specified",
        state: "Not specified",
        tier: "SELF_DECLARED",
      },
    });
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

  // Create product (DRAFT first), then its stage entries.
  await db.product.create({
    data: {
      id: productId,
      artisanId: artisan.id,
      title: body.title.trim(),
      materials: body.materials.trim(),
      storyText: body.storyText?.trim() || null,
      category: body.category.trim(),
      status: "DRAFT",
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

  await db.product.update({
    where: { id: productId },
    data: {
      status: "SEALED",
      contentHash,
      qrPngUrl: `/api/products/${productId}/qr`,
      sealedAt: new Date(),
    },
  });

  return NextResponse.json({ id: productId });
}
