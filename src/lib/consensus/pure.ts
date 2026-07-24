import { getWeights, SIGNAL_TARGETS, type SourceKey, type WeightTable } from "./weights";

/**
 * The pure consensus math — no database, no imports beyond the (also pure)
 * weight table. Both the live scorer (score.ts, which fetches from the DB) and
 * the seed (which builds signals from data it just created) call this, so the
 * formula has exactly one home and the two can never drift apart.
 */

export type ConsensusLevel = "STRONG" | "GOOD" | "MODERATE" | "EMERGING";

export type SourceContribution = {
  key: SourceKey;
  weight: number;
  signal: number;
  contribution: number;
  present: boolean;
  detail: string;
};

export type Consensus = {
  score: number;
  level: ConsensusLevel;
  sources: SourceContribution[];
  parties: {
    cooperatives: string[];
    ngos: string[];
    scanCount: number;
    distinctLocations: number;
    hasConsistentHistory: boolean;
    priorRegistrations: number;
  };
};

/** The precomputed, DB-free inputs to the score. */
export type RawSignals = {
  /** Distinct INDEPENDENT cooperative attesters (maker already excluded). */
  cooperatives: string[];
  /** Distinct INDEPENDENT NGO attesters. */
  ngos: string[];
  timelineSignal: number; // 0..1
  timelineDetail: string;
  historySignal: number; // 0..1
  historyDetail: string;
  priorRegistrations: number;
  scanCount: number;
  distinctLocations: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function levelFor(score: number): ConsensusLevel {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "MODERATE";
  return "EMERGING";
}

/** 0 → none, 1 → strong, 2+ → full. One independent voucher is most of the value. */
function attesterSignal(n: number): number {
  return n >= 2 ? 1 : n === 1 ? 0.8 : 0;
}

export function assembleConsensus(raw: RawSignals, weights: WeightTable = getWeights()): Consensus {
  const coopSig = attesterSignal(raw.cooperatives.length);
  const ngoSig = attesterSignal(raw.ngos.length);
  const buyerSig = clamp01(
    0.6 * Math.min(1, raw.scanCount / SIGNAL_TARGETS.scanCount) +
      0.4 * Math.min(1, raw.distinctLocations / SIGNAL_TARGETS.distinctLocations),
  );

  const rows: Array<{ key: SourceKey; signal: number; detail: string }> = [
    {
      key: "cooperative",
      signal: coopSig,
      detail: raw.cooperatives.length
        ? `Confirmed by ${raw.cooperatives.length} cooperative${raw.cooperatives.length > 1 ? "s" : ""}`
        : "No cooperative has confirmed this yet",
    },
    {
      key: "ngo",
      signal: ngoSig,
      detail: raw.ngos.length
        ? `Confirmed by ${raw.ngos.length} partner NGO${raw.ngos.length > 1 ? "s" : ""}`
        : "No partner NGO has confirmed this yet",
    },
    { key: "timeline", signal: clamp01(raw.timelineSignal), detail: raw.timelineDetail },
    { key: "history", signal: clamp01(raw.historySignal), detail: raw.historyDetail },
    {
      key: "buyerScans",
      signal: buyerSig,
      detail: raw.scanCount
        ? `${raw.scanCount} verified scan${raw.scanCount > 1 ? "s" : ""} from ${raw.distinctLocations} location${
            raw.distinctLocations === 1 ? "" : "s"
          }`
        : "No verified scans yet",
    },
  ];

  const sources: SourceContribution[] = rows.map((r) => {
    const weight = weights[r.key];
    const contribution = weight * r.signal;
    return {
      key: r.key,
      weight,
      signal: Number(r.signal.toFixed(4)),
      contribution: Number(contribution.toFixed(4)),
      present: r.signal > 0,
      detail: r.detail,
    };
  });

  const totalWeight = sources.reduce((a, s) => a + s.weight, 0) || 1;
  const totalContribution = sources.reduce((a, s) => a + s.contribution, 0);
  const score = Math.round((100 * totalContribution) / totalWeight);

  return {
    score,
    level: levelFor(score),
    sources,
    parties: {
      cooperatives: raw.cooperatives,
      ngos: raw.ngos,
      scanCount: raw.scanCount,
      distinctLocations: raw.distinctLocations,
      hasConsistentHistory: raw.historySignal >= 0.7,
      priorRegistrations: raw.priorRegistrations,
    },
  };
}

export type { SourceKey };
