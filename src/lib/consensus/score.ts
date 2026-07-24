import { db } from "../db";
import { STAGE_ORDER } from "../product-record";
import { getWeights } from "./weights";
import { assembleConsensus, type RawSignals } from "./pure";

/**
 * The multi-party consensus scorer (DB side).
 *
 * Fetches the five independent signals for a product and hands them to the pure
 * math in pure.ts. Pure read — it never writes anything, and never touches the
 * authenticity core. A caller that wants to FREEZE the result appends an
 * AuthenticityRecord version (lib/authenticity/record); this only computes.
 *
 * Independence from the vendor is enforced here: a cooperative/NGO attestation
 * whose attester is the product's own maker is discarded before it can
 * contribute. Combined with the fact that no vendor-supplied document is an
 * input at all, the vendor cannot lift their own score.
 */

// Re-exported so existing importers keep working after the pure refactor.
export type { Consensus, ConsensusLevel, SourceContribution } from "./pure";

const norm = (s: string) => s.trim().toLowerCase();
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Build the DB-free raw signals for a product, applying the independence rule. */
export async function computeRawSignals(productId: string): Promise<RawSignals | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { artisan: true, stages: true, attestations: true, verificationScans: true },
  });
  if (!product) return null;

  const makerName = norm(product.artisan.fullName);

  // ── Signals 1 & 2: independent-party attestations (maker excluded) ───────
  const liveAttestations = product.attestations.filter(
    (a) => !a.revokedAt && norm(a.attesterName) !== makerName,
  );
  const cooperatives = [
    ...new Set(
      liveAttestations.filter((a) => a.attesterType === "COOPERATIVE").map((a) => a.attesterName),
    ),
  ];
  const ngos = [
    ...new Set(liveAttestations.filter((a) => a.attesterType === "NGO").map((a) => a.attesterName)),
  ];

  // ── Signal 3: staged timeline (completeness × monotonic timestamps) ──────
  const latestPerStage = STAGE_ORDER.map((name) => {
    const entries = product.stages
      .filter((s) => s.stage === name)
      .sort((a, b) => b.version - a.version);
    return entries[0] ?? null;
  });
  const stagesPresent = latestPerStage.filter(Boolean).length;
  const times = latestPerStage
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => s.capturedAt.getTime());
  let monotonic = true;
  for (let i = 1; i < times.length; i++) if (times[i] < times[i - 1]) monotonic = false;
  const timelineSignal = clamp01((stagesPresent / STAGE_ORDER.length) * (monotonic ? 1 : 0.6));

  // ── Signal 4: internal history consistency ───────────────────────────────
  const siblings = await db.product.findMany({
    where: { artisanId: product.artisanId, status: "SEALED", id: { not: product.id } },
    select: { category: true, materials: true },
  });
  const { signal: historySignal, detail: historyDetail } = historyConsistency(
    { category: product.category, materials: product.materials },
    siblings,
  );

  // ── Signal 5: buyer verification history ─────────────────────────────────
  const scanCount = product.verificationScans.length;
  const distinctLocations = new Set(
    product.verificationScans.map((s) => s.locationLabel).filter(Boolean),
  ).size;

  return {
    cooperatives,
    ngos,
    timelineSignal,
    timelineDetail: `${stagesPresent} of ${STAGE_ORDER.length} production stages documented${
      monotonic ? ", timestamps consistent" : ", timestamps out of order"
    }`,
    historySignal,
    historyDetail,
    priorRegistrations: siblings.length,
    scanCount,
    distinctLocations,
  };
}

/** Shared history-consistency calc (exported so the seed can reuse the exact rule). */
export function historyConsistency(
  self: { category: string; materials: string },
  siblings: Array<{ category: string; materials: string }>,
): { signal: number; detail: string } {
  if (siblings.length === 0) {
    return {
      signal: 0.3,
      detail: "First registration by this maker — no track record yet",
    };
  }
  const sameCategory = siblings.filter((s) => norm(s.category) === norm(self.category)).length;
  const categoryConsistency = sameCategory / siblings.length;
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[,\n;]+|\s{2,}/)
        .map((w) => w.trim())
        .filter(Boolean),
    );
  const mine = words(self.materials);
  const theirs = words(siblings.map((s) => s.materials).join(", "));
  let overlap = 0;
  for (const w of mine) if (theirs.has(w)) overlap++;
  const materialConsistency = mine.size ? overlap / mine.size : 0;
  const signal = clamp01(0.5 * categoryConsistency + 0.5 * materialConsistency);
  return {
    signal,
    detail:
      signal >= 0.7
        ? `Consistent with ${siblings.length} earlier ${siblings.length === 1 ? "piece" : "pieces"} by this maker`
        : signal >= 0.4
          ? "Partly matches this maker's earlier work"
          : "Differs from this maker's usual craft or materials",
  };
}

/** The full consensus for a product. */
export async function computeConsensus(productId: string) {
  const raw = await computeRawSignals(productId);
  if (!raw) return null;
  return assembleConsensus(raw, getWeights());
}
