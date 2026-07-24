/**
 * §2.3 — rough-edge variant rotation.
 *
 * The rotation is the entire point. If every hand-drawn edge is identical the
 * eye clocks it as machine-made within about three interactions and the effect
 * collapses. So variants are assigned pseudo-randomly per instance, seeded by
 * index so the assignment is stable across re-renders (no hydration mismatch,
 * no reshuffle on every paint), and constrained so no two adjacent instances
 * ever share a variant.
 */

export const ROUGH_VARIANTS = 4;
export type RoughVariant = 1 | 2 | 3 | 4;

// Small integer hash — deterministic, no dependency, no Math.random.
function hash(n: number, seed: number): number {
  let h = Math.imul(n + 1, 2654435761) + Math.imul(seed + 1, 40503);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * Variants for `count` consecutive instances. The step is always 1–3, never 0
 * mod 4, which is what guarantees neighbours differ while keeping the sequence
 * irregular rather than a visible 1-2-3-4 cycle.
 */
export function roughSequence(count: number, seed = 0): RoughVariant[] {
  const out: RoughVariant[] = [];
  let v = hash(0, seed) % ROUGH_VARIANTS;
  for (let i = 0; i < count; i++) {
    v = (v + 1 + (hash(i, seed) % (ROUGH_VARIANTS - 1))) % ROUGH_VARIANTS;
    out.push((v + 1) as RoughVariant);
  }
  return out;
}

/** Edge classes for `count` consecutive plates — the list-level convenience. */
export function roughClasses(count: number, seed = 0): string[] {
  return roughSequence(count, seed).map((v) => `rough-${v}`);
}

/** Single-instance convenience. Prefer roughSequence for lists. */
export function roughVariant(index: number, seed = 0): RoughVariant {
  return roughSequence(index + 1, seed)[index];
}

/** Plate / divider / badge edges. */
export function roughClass(index: number, seed = 0): string {
  return `rough-${roughVariant(index, seed)}`;
}

/** Paint-stroke selection highlights — more ragged, with bleeding ends. */
export function tornClass(index: number, seed = 0): string {
  return `torn-${roughVariant(index, seed + 7)}`;
}
