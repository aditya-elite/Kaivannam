import { db } from "./db";
import { sha256 } from "./hash";

/**
 * LedgerService — the tamper-evident append-only ledger, abstracted so the
 * backend can be swapped (local hash-chain now; Hyperledger/eth/etc. later)
 * WITHOUT touching application logic.
 *
 * In artisan/consumer-facing copy this is called a "secure record" / "permanent
 * proof" — never "chain", "mint", or "on-chain".
 */
export interface LedgerService {
  readonly backend: string;
  readonly isTestnet: boolean;

  /** Append a product's content hash to the ledger; returns the sealed entry. */
  append(productId: string, contentHash: string): Promise<LedgerReceipt>;

  /** Re-derive and confirm the chain link for a product is intact. */
  verify(productId: string): Promise<LedgerVerification>;
}

export type LedgerReceipt = {
  seq: number;
  entryHash: string;
  prevHash: string;
  backend: string;
  isTestnet: boolean;
};

export type LedgerVerification = {
  exists: boolean;
  intact: boolean; // recomputed entryHash matches stored entryHash
  seq?: number;
  entryHash?: string;
  backend?: string;
  isTestnet?: boolean;
};

const GENESIS = "0".repeat(64);

/** Compute the deterministic hash linking one entry to the previous. */
function linkHash(seq: number, productId: string, contentHash: string, prevHash: string) {
  return sha256(`${seq}|${productId}|${contentHash}|${prevHash}`);
}

/**
 * Local hash-chain ledger backed by SQLite. Each entry stores the previous
 * entry's hash, so altering any past record breaks every subsequent link.
 * Clearly labelled isTestnet=true so the UI never implies a permanent public
 * record where none exists yet.
 */
class LocalHashChainLedger implements LedgerService {
  readonly backend = "local";
  readonly isTestnet = true;

  async append(productId: string, contentHash: string): Promise<LedgerReceipt> {
    // Serialize appends to keep seq/prevHash consistent (fine for dev scale).
    return db.$transaction(async (tx) => {
      const last = await tx.ledgerEntry.findFirst({ orderBy: { seq: "desc" } });
      const seq = (last?.seq ?? 0) + 1;
      const prevHash = last?.entryHash ?? GENESIS;
      const entryHash = linkHash(seq, productId, contentHash, prevHash);

      await tx.ledgerEntry.create({
        data: {
          seq,
          productId,
          contentHash,
          prevHash,
          entryHash,
          backend: this.backend,
          isTestnet: this.isTestnet,
        },
      });

      return { seq, entryHash, prevHash, backend: this.backend, isTestnet: this.isTestnet };
    });
  }

  async verify(productId: string): Promise<LedgerVerification> {
    const entry = await db.ledgerEntry.findUnique({ where: { productId } });
    if (!entry) return { exists: false, intact: false };
    const recomputed = linkHash(entry.seq, productId, entry.contentHash, entry.prevHash);
    return {
      exists: true,
      intact: recomputed === entry.entryHash,
      seq: entry.seq,
      entryHash: entry.entryHash,
      backend: entry.backend,
      isTestnet: entry.isTestnet,
    };
  }
}

let instance: LedgerService | null = null;

export function getLedger(): LedgerService {
  if (instance) return instance;
  switch (process.env.LEDGER_BACKEND) {
    case "local":
    default:
      instance = new LocalHashChainLedger();
  }
  return instance;
}
