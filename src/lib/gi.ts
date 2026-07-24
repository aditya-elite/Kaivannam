import { db } from "./db";

/**
 * Cross-check an artisan's name against the ingested GI Part B register.
 * There is NO live government API — this only ever checks the manually-ingested
 * dataset, and callers must always surface the dataset date to users.
 */
export async function crossCheckGi(name: string, claimedGi: string | null) {
  const dataset = await db.giDataset.findFirst({ orderBy: { version: "desc" } });
  if (!dataset) return { dataset: null, match: null as null | { id: string; giNumber: string; giName: string } };

  const normalized = name.trim().toLowerCase();
  const entries = await db.giEntry.findMany({
    where: {
      datasetId: dataset.id,
      ...(claimedGi ? { giName: claimedGi } : {}),
    },
  });
  const match = entries.find(
    (e) => e.authorisedUser && e.authorisedUser.trim().toLowerCase() === normalized,
  );
  return {
    dataset: { version: dataset.version, lastSyncedAt: dataset.lastSyncedAt },
    match: match ? { id: match.id, giNumber: match.giNumber, giName: match.giName } : null,
  };
}

/** Normalise a GI number for tolerant matching (OCR is noisy): upper, strip spaces. */
export function normalizeGiNumber(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Gate 2 — match a GI number (read from an artisan's certificate) against the
 * latest ingested GI register. Returns the matched entry + dataset provenance,
 * which the caller must always surface (never implies a live gov API).
 */
export async function lookupGiByNumber(giNumber: string) {
  const dataset = await db.giDataset.findFirst({ orderBy: { version: "desc" } });
  if (!dataset) return { dataset: null, entry: null };

  const target = normalizeGiNumber(giNumber);
  const entries = await db.giEntry.findMany({ where: { datasetId: dataset.id } });
  const entry = entries.find((e) => normalizeGiNumber(e.giNumber) === target) ?? null;

  return {
    dataset: { version: dataset.version, lastSyncedAt: dataset.lastSyncedAt },
    entry: entry
      ? { id: entry.id, giNumber: entry.giNumber, giName: entry.giName, region: entry.region }
      : null,
  };
}
