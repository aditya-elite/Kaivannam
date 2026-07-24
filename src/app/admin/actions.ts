"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { finalizeArtisanVerification } from "@/lib/verify-artisan";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("forbidden");
  return user;
}

export async function decideVerification(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId"));
  const decision = String(formData.get("decision")); // "approve" | "reject"
  const reason = String(formData.get("reason") ?? "").trim();

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: { artisan: true },
  });
  if (!request) return;

  if (decision === "approve") {
    // Confirm Gate 1: set the Pehchan on the profile, cross-check the GI Part-B
    // register for a possible GI_AUTHORISED upgrade, and ensure a signing keypair.
    const { tier, giMatched } = await finalizeArtisanVerification({
      artisanId: request.artisanId,
      name: request.ocrName ?? request.artisan.fullName,
      claimedGi: request.claimedGi,
      pehchanNumber: request.idNumber,
      pehchanDocUrl: request.docImageUrl,
    });
    await db.verificationRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewNote: reason || null, reviewedBy: admin.id, reviewedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "VERIFICATION_APPROVED",
        target: request.artisanId,
        detail: JSON.stringify({ tier, giMatched, reason }),
      },
    });
  } else {
    await db.verificationRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewNote: reason || null, reviewedBy: admin.id, reviewedAt: new Date() },
    });
    // Roll back to self-declared if they have no other approved verification.
    await db.artisan.update({
      where: { id: request.artisanId },
      data: { tier: "SELF_DECLARED", pehchanVerified: false },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "VERIFICATION_REJECTED",
        target: request.artisanId,
        detail: JSON.stringify({ reason }),
      },
    });
  }
  revalidatePath("/admin");
}

/**
 * Review a processed ID document (the signing/anchoring pipeline record).
 * Sets the DOCUMENT status only — VERIFIED means "Kaivannam reviewed the
 * processed document", NOT "government-verified". Independent of decideVerification
 * above (which drives the artisan tier).
 */
export async function decideIdDocument(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId"));
  const decision = String(formData.get("decision")); // "verify" | "reject"
  const reason = String(formData.get("reason") ?? "").trim();

  const request = await db.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request) return;

  const verify = decision === "verify";
  await db.verificationRequest.update({
    where: { id: requestId },
    data: {
      idDocStatus: verify ? "VERIFIED" : "REJECTED",
      idDocError: verify ? null : reason || "Reviewed as not a valid document image",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: verify ? "ID_DOCUMENT_VERIFIED" : "ID_DOCUMENT_REJECTED",
      target: request.artisanId,
      detail: JSON.stringify({ requestId, reason }),
    },
  });
  revalidatePath("/admin");
}

/**
 * Monthly GI ingest. Admin pastes the register rows (pipe-separated):
 *   gi_number | gi_name | craft_category | region | authorised_user
 * Creates a NEW dataset version and its entries, stamping the sync date.
 */
export async function ingestGiDataset(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const raw = String(formData.get("rows") ?? "");
  const note = String(formData.get("note") ?? "").trim() || "Manual GI ingest";

  const rows = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("|").map((c) => c.trim()));

  const valid = rows.filter((c) => c.length >= 4 && c[0] && c[1]);
  if (valid.length === 0) return;

  const last = await db.giDataset.findFirst({ orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;

  const dataset = await db.giDataset.create({
    data: {
      version,
      sourceNote: note,
      entries: {
        create: valid.map((c) => ({
          giNumber: c[0],
          giName: c[1],
          craftCategory: c[2],
          region: c[3],
          authorisedUser: c[4] || null,
        })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: "GI_DATASET_INGESTED",
      target: dataset.id,
      detail: JSON.stringify({ version, rows: valid.length }),
    },
  });
  revalidatePath("/admin");
}

/**
 * Pehchan register ingest (Gate-1 whitelist). Admin pastes rows (pipe-separated):
 *   pehchan_number | holder_name | craft | region
 * Creates a NEW dataset version. Numbers are stored normalised (no spaces/dashes).
 */
export async function ingestPehchanDataset(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const raw = String(formData.get("rows") ?? "");
  const note = String(formData.get("note") ?? "").trim() || "Manual Pehchan ingest";

  const rows = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("|").map((c) => c.trim()));

  const valid = rows.filter((c) => c.length >= 2 && c[0] && c[1]);
  if (valid.length === 0) return;

  const last = await db.pehchanDataset.findFirst({ orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;

  const dataset = await db.pehchanDataset.create({
    data: {
      version,
      sourceNote: note,
      entries: {
        create: valid.map((c) => ({
          pehchanNumber: c[0].replace(/[\s-]/g, ""),
          holderName: c[1],
          craft: c[2] || null,
          region: c[3] || null,
        })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: "PEHCHAN_DATASET_INGESTED",
      target: dataset.id,
      detail: JSON.stringify({ version, rows: valid.length }),
    },
  });
  revalidatePath("/admin");
}
