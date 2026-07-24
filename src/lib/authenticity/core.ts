import { db } from "../db";
import { canonicalize, productContentHash } from "../hash";
import { buildRecord } from "../product-record";
import type { ProductRecordForHash } from "../hash";

/**
 * LAYER 1 — the authenticity core.
 *
 * The "making-facts" of a product: its identity, its maker, its materials and
 * its staged production timeline. This is the data the product hash is computed
 * from. Custody (who holds it now) is deliberately NOT here — that lives in
 * Layer 2 (lib/ownership) and is never part of the hash, which is why a product
 * can be transferred any number of times and still verify against its original
 * fingerprint.
 *
 * Everything in this module is READ-of-making-facts + hash. It does not know
 * ownership exists.
 */

/** Load a product's making-facts in the exact shape the hash is computed over. */
export async function loadMakingFacts(productId: string): Promise<ProductRecordForHash | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { artisan: true, stages: true },
  });
  if (!product) return null;

  return buildRecord({
    id: product.id,
    title: product.title,
    materials: product.materials,
    category: product.category,
    storyText: product.storyText,
    artisan: {
      id: product.artisan.id,
      fullName: product.artisan.fullName,
      craft: product.artisan.craft,
      region: product.artisan.region,
    },
    hiddenSignatureHash: product.artisan.hiddenSignatureHash,
    stages: product.stages.map((s) => ({
      stage: s.stage,
      version: s.version,
      capturedAt: s.capturedAt,
      photoUrls: JSON.parse(s.photoUrls) as string[],
      note: s.note,
    })),
  });
}

/**
 * The making-fingerprint (`coreHash`) for a product as it currently stands.
 * v1 of the authenticity record stores this, and it equals Product.contentHash
 * written at seal (both hash the same built record via productContentHash).
 * Ownership contributes nothing to it.
 */
export async function computeCoreHash(productId: string): Promise<string | null> {
  const facts = await loadMakingFacts(productId);
  if (!facts) return null;
  return productContentHash(facts);
}

/** The coreHash of an already-built making-facts record. */
export function coreHashOf(facts: ProductRecordForHash): string {
  return productContentHash(facts);
}

/** Canonical JSON of the making-facts — stored on each authenticity version. */
export function makingFactsJson(facts: ProductRecordForHash): string {
  return canonicalize(facts);
}
