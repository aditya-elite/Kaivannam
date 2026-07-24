import { createHash } from "crypto";

/**
 * Deterministic SHA-256 hashing for the provenance record.
 *
 * The hash is computed over CONTENT and STABLE CONTENT IDENTIFIERS only —
 * never over mutable storage URLs. If files migrate from local disk to S3,
 * the URLs change but the hash must not. So we hash each file's own content
 * hash (a stable identifier), plus the textual record fields.
 */

/** Stable, key-sorted JSON so object key order can never change the hash. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortDeep((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash of a file's bytes — the stable content identifier used in the record. */
export function fileContentHash(bytes: Buffer): string {
  return sha256(bytes);
}

export type ProductRecordForHash = {
  productId: string;
  title: string;
  materials: string;
  category: string;
  storyText: string | null;
  artisan: { id: string; fullName: string; craft: string; region: string };
  hiddenSignatureHash: string | null; // included so tampering with it is detectable
  // Each stage referenced by its content identifiers, NOT its URLs.
  stages: Array<{
    stage: string;
    version: number;
    capturedAt: string; // ISO, server-side
    photoContentHashes: string[]; // stable ids, sorted
    note: string | null;
  }>;
};

/**
 * The canonical content hash of a product record. This is what gets written to
 * the ledger and re-derived at verification time to prove nothing changed.
 */
export function productContentHash(record: ProductRecordForHash): string {
  return sha256(canonicalize(record));
}
