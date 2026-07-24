import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, decodeDataUrl } from "@/lib/storage";
import { validatePehchan } from "@/lib/pehchan";
import { finalizeArtisanVerification } from "@/lib/verify-artisan";

type Body = {
  image?: string; // optional — number-only entry has no photo
  pehchanNumber?: string; // the Pehchan number (typed or OCR-read, user-confirmed)
  fields?: { idNumber?: string; name?: string; craft?: string; region?: string };
  claimedGi?: string;
  rawText?: string;
  confidence?: Record<string, number>;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await req.json()) as Body;
  const fields = body.fields ?? {};
  const pehchanInput = (body.pehchanNumber || fields.idNumber || "").trim();

  // ── Gate 1 validity: format+checksum AND membership in the register. ──
  const validity = await validatePehchan(pehchanInput);

  // Ensure an artisan profile exists.
  let artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan) {
    artisan = await db.artisan.create({
      data: {
        userId: user.id,
        fullName: fields.name || user.displayName,
        craft: fields.craft || "Not specified",
        region: fields.region || "Not specified",
        state: "Not specified",
        tier: "SELF_DECLARED",
      },
    });
  }

  // Persist the ID photo if one was provided.
  let docUrl: string | null = null;
  if (body.image) {
    const decoded = decodeDataUrl(body.image);
    if (!decoded) return NextResponse.json({ error: "bad_image" }, { status: 400 });
    const stored = await getStorage().put(decoded.bytes, { ext: decoded.ext, prefix: `ids/${artisan.id}` });
    docUrl = stored.url;
  }

  const autoApprove = validity.valid;

  await db.verificationRequest.create({
    data: {
      artisanId: artisan.id,
      docImageUrl: docUrl,
      ocrIdNumber: fields.idNumber || null,
      ocrName: fields.name || null,
      ocrCraft: fields.craft || null,
      ocrRegion: fields.region || null,
      ocrConfidence: body.confidence ? JSON.stringify(body.confidence) : null,
      ocrRawText: body.rawText || null,
      idNumber: validity.formatOk ? validity.normalized : pehchanInput || null,
      claimedGi: body.claimedGi || null,
      // A valid Pehchan (real, registered number) is self-authenticating → approved.
      // Otherwise it queues for admin review.
      status: autoApprove ? "APPROVED" : "PENDING",
      reviewNote: autoApprove ? "Auto-approved: Pehchan matched the register" : null,
      reviewedAt: autoApprove ? new Date() : null,
    },
  });

  if (autoApprove) {
    await finalizeArtisanVerification({
      artisanId: artisan.id,
      name: fields.name || artisan.fullName,
      claimedGi: body.claimedGi || null,
      pehchanNumber: validity.normalized,
      pehchanDocUrl: docUrl,
    });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "VERIFICATION_AUTO_APPROVED",
        target: artisan.id,
        detail: JSON.stringify({ pehchan: "register-match" }),
      },
    });
  } else {
    // Move Self-declared → Documents pending (never downgrade a higher tier).
    if (artisan.tier === "SELF_DECLARED") {
      await db.artisan.update({ where: { id: artisan.id }, data: { tier: "DOCS_PENDING" } });
    }
    await db.auditLog.create({
      data: { actorId: user.id, action: "VERIFICATION_SUBMITTED", target: artisan.id },
    });
  }

  return NextResponse.json({
    ok: true,
    verified: autoApprove,
    formatOk: validity.formatOk,
    inRegister: validity.inRegister,
  });
}
