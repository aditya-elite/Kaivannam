/**
 * Consensus weight table — how much each independent signal contributes to a
 * product's trustworthiness score.
 *
 * The ONE principle: weight tracks independence from the vendor. A signal the
 * vendor cannot manufacture is worth more than one they can. So the two genuinely
 * independent parties (a cooperative, an NGO) carry the most weight; the internal
 * track-record check and the accumulated buyer-scan history carry less; and the
 * staged timeline — already part of the system — contributes its own share.
 *
 * These are the FIVE and only five inputs. Vendor-supplied documents (the GI
 * certificate, the Pehchan ID, extra photos) are deliberately absent: there is
 * no code path that turns "the vendor uploaded more of their own material" into
 * a higher score. That is the structural anti-gaming guarantee — it isn't a
 * number here that happens to be zero, it's the absence of a weight at all.
 *
 * The table is configurable. Override at deploy time with a CONSENSUS_WEIGHTS
 * env var (JSON), so the balance can be tuned without a code change.
 */

export type SourceKey = "cooperative" | "ngo" | "timeline" | "history" | "buyerScans";

export type WeightTable = Record<SourceKey, number>;

/**
 * Default weights. Ordered high-to-low by independence from the vendor:
 *   cooperative  — an independent org with its own reputation, highest
 *   ngo          — another independent party
 *   timeline     — the existing staged record, hard to fake over weeks
 *   history      — consistency with the maker's own past registrations
 *   buyerScans   — real-world circulation evidence, accrues slowly
 *
 * They sum to 100 so a fully-corroborated item scores 100, but the scorer
 * normalises against the actual sum, so any tuning stays valid.
 */
export const DEFAULT_WEIGHTS: WeightTable = {
  cooperative: 30,
  ngo: 25,
  timeline: 20,
  history: 15,
  buyerScans: 10,
};

/** Targets that shape how raw signals saturate to 1.0. Also tunable. */
export const SIGNAL_TARGETS = {
  /** Distinct buyer scans at which the buyer-history signal is near-full. */
  scanCount: 6,
  /** Distinct locations at which the location-spread signal is full. */
  distinctLocations: 3,
} as const;

let cached: WeightTable | null = null;

/** The active weight table (env override applied once, then cached). */
export function getWeights(): WeightTable {
  if (cached) return cached;
  cached = { ...DEFAULT_WEIGHTS };
  const raw = process.env.CONSENSUS_WEIGHTS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<WeightTable>;
      for (const k of Object.keys(cached) as SourceKey[]) {
        const v = parsed[k];
        if (typeof v === "number" && v >= 0) cached[k] = v;
      }
    } catch {
      /* malformed override — fall back to defaults */
    }
  }
  return cached;
}

/** Test hook: forget the cached table so an env override can be re-read. */
export function _resetWeights(): void {
  cached = null;
}
