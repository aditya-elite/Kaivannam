"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { crossCheckGi } from "@/lib/gi";

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
    // ID confirmed → ID_VERIFIED. If the name also matches the GI Part B
    // register, upgrade to GI_AUTHORISED and record the match with its version.
    const gi = await crossCheckGi(request.ocrName ?? request.artisan.fullName, request.claimedGi);
    let tier: "ID_VERIFIED" | "GI_AUTHORISED" = "ID_VERIFIED";
    if (gi.match && gi.dataset) {
      tier = "GI_AUTHORISED";
      await db.giMatch.upsert({
        where: { artisanId: request.artisanId },
        create: {
          artisanId: request.artisanId,
          giEntryId: gi.match.id,
          datasetVersion: gi.dataset.version,
        },
        update: { giEntryId: gi.match.id, datasetVersion: gi.dataset.version },
      });
    }
    await db.artisan.update({ where: { id: request.artisanId }, data: { tier } });
    await db.verificationRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewNote: reason || null, reviewedBy: admin.id, reviewedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "VERIFICATION_APPROVED",
        target: request.artisanId,
        detail: JSON.stringify({ tier, giMatched: !!gi.match, reason }),
      },
    });
  } else {
    await db.verificationRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewNote: reason || null, reviewedBy: admin.id, reviewedAt: new Date() },
    });
    // Roll back to self-declared if they have no other approved verification.
    await db.artisan.update({ where: { id: request.artisanId }, data: { tier: "SELF_DECLARED" } });
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
