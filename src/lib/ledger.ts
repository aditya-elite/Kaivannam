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

  /**
   * Anchor a NON-product content hash (e.g. the SHA-256 of an uploaded ID
   * document image) on the SAME chain. `subjectId` is a stable key for the
   * thing being anchored — for ID documents, the verification request id. Only
   * the hash is stored; never the raw image or any PII. Same hash-then-anchor
   * pattern as products, so it earns the same tamper-evidence.
   */
  appendDocument(subjectId: string, contentHash: string): Promise<LedgerReceipt>;

  /** Re-derive and confirm the chain link for an anchored document is intact. */
  verifyDocument(subjectId: string): Promise<LedgerVerification>;
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

/** Compute the deterministic hash linking one entry to the previous. The
    subjectId is the product id for products (formula unchanged) or the request
    id for anchored documents. */
function linkHash(seq: number, subjectId: string, contentHash: string, prevHash: string) {
  return sha256(`${seq}|${subjectId}|${contentHash}|${prevHash}`);
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

  /** Shared append: the subjectId is what gets mixed into the entry hash. For a
      product, subjectId === productId, so the formula is identical to before
      and every already-sealed product still verifies. */
  private async appendSubject(
    subjectType: "PRODUCT" | "ID_DOCUMENT",
    subjectId: string,
    productId: string | null,
    contentHash: string,
  ): Promise<LedgerReceipt> {
    // Serialize appends to keep seq/prevHash consistent (fine for dev scale).
    return db.$transaction(async (tx) => {
      const last = await tx.ledgerEntry.findFirst({ orderBy: { seq: "desc" } });
      const seq = (last?.seq ?? 0) + 1;
      const prevHash = last?.entryHash ?? GENESIS;
      const entryHash = linkHash(seq, subjectId, contentHash, prevHash);

      await tx.ledgerEntry.create({
        data: {
          seq,
          subjectType,
          subjectId,
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

  async append(productId: string, contentHash: string): Promise<LedgerReceipt> {
    return this.appendSubject("PRODUCT", productId, productId, contentHash);
  }

  async appendDocument(subjectId: string, contentHash: string): Promise<LedgerReceipt> {
    return this.appendSubject("ID_DOCUMENT", subjectId, null, contentHash);
  }

  async verify(productId: string): Promise<LedgerVerification> {
    const entry = await db.ledgerEntry.findUnique({ where: { productId } });
    if (!entry) return { exists: false, intact: false };
    // Recompute from the entry's own subjectId (== productId for products).
    const recomputed = linkHash(entry.seq, entry.subjectId, entry.contentHash, entry.prevHash);
    return {
      exists: true,
      intact: recomputed === entry.entryHash,
      seq: entry.seq,
      entryHash: entry.entryHash,
      backend: entry.backend,
      isTestnet: entry.isTestnet,
    };
  }

  async verifyDocument(subjectId: string): Promise<LedgerVerification> {
    const entry = await db.ledgerEntry.findFirst({
      where: { subjectType: "ID_DOCUMENT", subjectId },
      orderBy: { seq: "desc" },
    });
    if (!entry) return { exists: false, intact: false };
    const recomputed = linkHash(entry.seq, entry.subjectId, entry.contentHash, entry.prevHash);
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
