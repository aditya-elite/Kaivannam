import { getCurrentRecord, getHistory } from "./authenticity/record";
import { computeConsensus, type SourceContribution, type ConsensusLevel } from "./consensus/score";
import { getOwnership, getPendingTransfer } from "./ownership";

/**
 * The buyer-facing provenance view: the two layers assembled for one product,
 * kept deliberately separate in the shape itself so the UI can style them as
 * distinct things.
 *
 *   • `authenticity` — a permanent fact. The frozen consensus (who independently
 *     confirmed the making) plus the version history showing how it was
 *     established and corrected.
 *   • `custody` — current, changeable status. Who holds it now and the transfer
 *     history. Nothing here feeds the score or the hash.
 */

export type AuthenticityView = {
  trustScore: number;
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
  version: number;
  coreHashShort: string;
  lastUpdated: Date;
  history: Array<{
    version: number;
    trustScore: number;
    supersedeReason: string | null;
    at: Date;
  }>;
};

export type CustodyView = {
  currentOwner: string | null;
  transferCount: number;
  log: Array<{
    seq: number;
    fromParty: string | null;
    toParty: string;
    note: string | null;
    at: Date;
    isGenesis: boolean;
  }>;
  pending: { fromParty: string; toParty: string; note: string | null; at: Date } | null;
};

export type Provenance = {
  authenticity: AuthenticityView | null;
  custody: CustodyView;
};

export async function getProvenance(productId: string): Promise<Provenance> {
  const [current, history, ownership, pending] = await Promise.all([
    getCurrentRecord(productId),
    getHistory(productId),
    getOwnership(productId),
    getPendingTransfer(productId),
  ]);

  // The frozen record holds the consensus at its write time. We display the
  // FROZEN value (that is the authenticity-core contract), but if for any reason
  // a sealed product has no record yet, fall back to a live compute so the panel
  // still reads rather than showing nothing.
  let authenticity: AuthenticityView | null = null;
  if (current) {
    const c = current.consensus;
    authenticity = {
      trustScore: current.trustScore,
      level: c.level,
      sources: c.sources,
      parties: c.parties,
      version: current.version,
      coreHashShort: current.coreHash.slice(0, 16),
      lastUpdated: current.createdAt,
      history: history.map((h) => ({
        version: h.version,
        trustScore: h.trustScore,
        supersedeReason: h.supersedeReason,
        at: h.createdAt,
      })),
    };
  } else {
    const live = await computeConsensus(productId);
    if (live) {
      authenticity = {
        trustScore: live.score,
        level: live.level,
        sources: live.sources,
        parties: live.parties,
        version: 0,
        coreHashShort: "",
        lastUpdated: new Date(),
        history: [],
      };
    }
  }

  return {
    authenticity,
    custody: {
      currentOwner: ownership.currentOwner,
      transferCount: ownership.transferCount,
      log: ownership.log,
      pending: pending
        ? { fromParty: pending.fromParty, toParty: pending.toParty, note: pending.note, at: pending.createdAt }
        : null,
    },
  };
}
