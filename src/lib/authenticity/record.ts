import { db } from "../db";
import { computeConsensus, type Consensus } from "../consensus/score";
import { loadMakingFacts, coreHashOf, makingFactsJson } from "./core";
import type { AuthenticityRecord, Prisma } from "@prisma/client";

/**
 * LAYER 1 — the versioned, frozen authenticity record.
 *
 * Every function that changes what's "current" APPENDS a new version linked to
 * the last one. Nothing here ever runs an UPDATE on an existing row — that is
 * the immutability guarantee, enforced by only ever calling `.create`. A score
 * that rises over an item's life does so through a chain of versions, each a
 * frozen snapshot, never through mutation.
 *
 * Two reasons a new version is written:
 *   • a routine recompute, when new independent evidence (an attestation, more
 *     buyer scans) changes the consensus — `reason` is null;
 *   • a correction of the making-facts themselves — `reason` explains why.
 */

export type FrozenConsensus = Consensus;

export type AuthenticityVersion = {
  id: string;
  version: number;
  coreHash: string;
  trustScore: number;
  consensus: Consensus;
  makingFacts: unknown;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: Date;
};

function hydrate(rec: AuthenticityRecord): AuthenticityVersion {
  return {
    id: rec.id,
    version: rec.version,
    coreHash: rec.coreHash,
    trustScore: rec.trustScore,
    consensus: JSON.parse(rec.breakdown) as Consensus,
    makingFacts: JSON.parse(rec.recordJson) as unknown,
    supersedesId: rec.supersedesId,
    supersedeReason: rec.supersedeReason,
    createdAt: rec.createdAt,
  };
}

/** The current (latest) authenticity version for a product, or null. */
export async function getCurrentRecord(productId: string): Promise<AuthenticityVersion | null> {
  const rec = await db.authenticityRecord.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
  });
  return rec ? hydrate(rec) : null;
}

/** Full version history, oldest first — the audit trail shown in the UI. */
export async function getHistory(productId: string): Promise<AuthenticityVersion[]> {
  const rows = await db.authenticityRecord.findMany({
    where: { productId },
    orderBy: { version: "asc" },
  });
  return rows.map(hydrate);
}

/**
 * Create v1 at seal time. Computes the making-fingerprint and the initial
 * consensus (usually just the timeline; independent attestations and buyer
 * scans arrive later and supersede). Idempotent-ish: refuses if a record exists.
 */
export async function createInitialRecord(
  productId: string,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<AuthenticityVersion | null> {
  const facts = await loadMakingFacts(productId);
  if (!facts) return null;
  const consensus = await computeConsensus(productId);
  if (!consensus) return null;

  const existing = await tx.authenticityRecord.findFirst({ where: { productId } });
  if (existing) return getCurrentRecord(productId);

  const rec = await tx.authenticityRecord.create({
    data: {
      productId,
      version: 1,
      coreHash: coreHashOf(facts),
      recordJson: makingFactsJson(facts),
      trustScore: consensus.score,
      breakdown: JSON.stringify(consensus),
      supersedesId: null,
      supersedeReason: null,
    },
  });
  return hydrate(rec);
}

/** A stable signature of a consensus, to detect whether it actually changed. */
function consensusSignature(c: Consensus): string {
  return JSON.stringify([c.score, c.sources.map((s) => [s.key, s.signal])]);
}

/**
 * Recompute consensus and, IF it changed, append a new version (same making-
 * facts, same coreHash, fresh score). Returns the current version either way.
 * This is how a score legitimately rises — via supersede, never mutation.
 * Called after an attestation is added or buyer-scan history grows.
 */
export async function recomputeAndSupersedeIfChanged(
  productId: string,
): Promise<{ version: AuthenticityVersion | null; superseded: boolean }> {
  const latest = await db.authenticityRecord.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
  });
  if (!latest) {
    // No record yet (e.g. an unsealed product) — nothing to supersede.
    return { version: null, superseded: false };
  }

  const consensus = await computeConsensus(productId);
  if (!consensus) return { version: hydrate(latest), superseded: false };

  const prevConsensus = JSON.parse(latest.breakdown) as Consensus;
  if (consensusSignature(prevConsensus) === consensusSignature(consensus)) {
    return { version: hydrate(latest), superseded: false }; // nothing changed
  }

  // Append the next version. The unique constraint on (productId, version) and
  // on supersedesId makes a concurrent double-append fail rather than fork.
  const created = await db.authenticityRecord.create({
    data: {
      productId,
      version: latest.version + 1,
      coreHash: latest.coreHash, // making-facts unchanged, so fingerprint unchanged
      recordJson: latest.recordJson,
      trustScore: consensus.score,
      breakdown: JSON.stringify(consensus),
      supersedesId: latest.id,
      supersedeReason: null, // routine recompute, not a correction
    },
  });
  return { version: hydrate(created), superseded: true };
}

/**
 * CORRECTION PATH — supersede, never edit. Applies corrected making-facts to a
 * NEW version linked to the current one, with a reason. The original stays in
 * place and visible. The product's own row is untouched, so the original hash
 * and its ledger entry remain intact; the corrected snapshot and its new
 * fingerprint live in the new version.
 *
 * `corrections` are shallow overrides of the stored making-facts snapshot
 * (e.g. { materials: "…", artisan: { fullName: "…" } }).
 */
export async function supersedeForCorrection(
  productId: string,
  corrections: Record<string, unknown>,
  reason: string,
): Promise<AuthenticityVersion | null> {
  const latest = await db.authenticityRecord.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
  });
  if (!latest) return null;

  const prevFacts = JSON.parse(latest.recordJson) as Record<string, unknown>;
  // Shallow merge, with a one-level merge for the nested artisan object so a
  // name fix doesn't wipe the rest of the artisan block.
  const nextFacts: Record<string, unknown> = { ...prevFacts, ...corrections };
  if (corrections.artisan && typeof corrections.artisan === "object") {
    nextFacts.artisan = {
      ...(prevFacts.artisan as Record<string, unknown>),
      ...(corrections.artisan as Record<string, unknown>),
    };
  }

  const { productContentHash } = await import("../hash");
  const newCoreHash = productContentHash(nextFacts as never);
  const consensus = await computeConsensus(productId);

  const created = await db.authenticityRecord.create({
    data: {
      productId,
      version: latest.version + 1,
      coreHash: newCoreHash,
      recordJson: JSON.stringify(nextFacts),
      trustScore: consensus?.score ?? latest.trustScore,
      breakdown: consensus ? JSON.stringify(consensus) : latest.breakdown,
      supersedesId: latest.id,
      supersedeReason: reason,
    },
  });
  return hydrate(created);
}
