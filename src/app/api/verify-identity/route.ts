import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, decodeDataUrl } from "@/lib/storage";

type Body = {
  image: string;
  fields: { idNumber: string; name: string; craft: string; region: string };
  claimedGi?: string;
  rawText?: string;
  confidence?: Record<string, number>;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await req.json()) as Body;
  const decoded = decodeDataUrl(body.image);
  if (!decoded) return NextResponse.json({ error: "bad_image" }, { status: 400 });

  // Ensure an artisan profile exists.
  let artisan = await db.artisan.findUnique({ where: { userId: user.id } });
  if (!artisan) {
    artisan = await db.artisan.create({
      data: {
        userId: user.id,
        fullName: body.fields.name || user.displayName,
        craft: body.fields.craft || "Not specified",
        region: body.fields.region || "Not specified",
        state: "Not specified",
        tier: "SELF_DECLARED",
      },
    });
  }

  const stored = await getStorage().put(decoded.bytes, { ext: decoded.ext, prefix: `ids/${artisan.id}` });

  await db.verificationRequest.create({
    data: {
      artisanId: artisan.id,
      docImageUrl: stored.url,
      ocrIdNumber: body.fields.idNumber || null,
      ocrName: body.fields.name || null,
      ocrCraft: body.fields.craft || null,
      ocrRegion: body.fields.region || null,
      ocrConfidence: body.confidence ? JSON.stringify(body.confidence) : null,
      ocrRawText: body.rawText || null,
      idNumber: body.fields.idNumber || null,
      claimedGi: body.claimedGi || null,
      status: "PENDING",
    },
  });

  // Move Self-declared → Documents pending (never downgrade a higher tier).
  if (artisan.tier === "SELF_DECLARED") {
    await db.artisan.update({ where: { id: artisan.id }, data: { tier: "DOCS_PENDING" } });
  }

  await db.auditLog.create({
    data: { actorId: user.id, action: "VERIFICATION_SUBMITTED", target: artisan.id },
  });

  return NextResponse.json({ ok: true });
}
