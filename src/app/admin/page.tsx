import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { crossCheckGi } from "@/lib/gi";
import { AdminView } from "@/components/views/AdminView";

// Admin panel — verification review queue + GI dataset ingest. ADMIN only.
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const [pending, dataset, pehchanDs, recentAudit] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { artisan: true },
    }),
    db.giDataset.findFirst({ orderBy: { version: "desc" }, include: { _count: { select: { entries: true } } } }),
    db.pehchanDataset.findFirst({ orderBy: { version: "desc" }, include: { _count: { select: { entries: true } } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  // Pre-compute the GI cross-check result for each pending request.
  // ID-document pipeline queue: processed docs awaiting Kaivannam review.
  const idDocRows = await db.verificationRequest.findMany({
    where: { idDocStatus: "PENDING", imageSha256: { not: null } },
    orderBy: { processedAt: "asc" },
    include: { artisan: { select: { fullName: true } } },
  });
  const idDocs = idDocRows.map((r) => ({
    id: r.id,
    artisanName: r.artisan.fullName,
    idNumber: r.ocrIdNumber,
    craft: r.ocrCraft,
    region: r.ocrRegion,
    imageHashShort: r.imageSha256 ? r.imageSha256.slice(0, 16) : null,
    anchorSeq: r.anchorSeq,
    signaturePresent: !!r.serverSignature,
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
  }));

  const queue = await Promise.all(
    pending.map(async (r) => {
      const gi = await crossCheckGi(r.ocrName ?? r.artisan.fullName, r.claimedGi);
      return {
        id: r.id,
        artisanName: r.artisan.fullName,
        artisanTier: r.artisan.tier,
        docImageUrl: r.docImageUrl,
        ocr: {
          idNumber: r.ocrIdNumber,
          name: r.ocrName,
          craft: r.ocrCraft,
          region: r.ocrRegion,
          confidence: r.ocrConfidence ? (JSON.parse(r.ocrConfidence) as Record<string, number>) : null,
          rawText: r.ocrRawText,
        },
        claimedGi: r.claimedGi,
        giMatch: gi.match,
        giDatasetVersion: gi.dataset?.version ?? null,
        giSyncedAt: gi.dataset ? gi.dataset.lastSyncedAt.toISOString() : null,
      };
    }),
  );

  return (
    <AdminView
      queue={queue}
      dataset={
        dataset
          ? {
              version: dataset.version,
              entries: dataset._count.entries,
              lastSyncedAt: dataset.lastSyncedAt.toISOString(),
              sourceNote: dataset.sourceNote,
            }
          : null
      }
      pehchanDataset={
        pehchanDs
          ? {
              version: pehchanDs.version,
              entries: pehchanDs._count.entries,
              lastSyncedAt: pehchanDs.lastSyncedAt.toISOString(),
              sourceNote: pehchanDs.sourceNote,
            }
          : null
      }
      audit={recentAudit.map((a) => ({
        action: a.action,
        target: a.target,
        createdAt: a.createdAt.toISOString(),
      }))}
      idDocs={idDocs}
    />
  );
}
