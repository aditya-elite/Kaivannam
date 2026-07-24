/**
 * Dye-lot variance — the roughness argument (lib/rough.ts) applied to colour
 * instead of shape.
 *
 * Natural dye lots never match. A grid of twelve byte-identical terracotta
 * swatches reads as machine output; the same twelve drifting a few degrees of
 * hue and a few percent of lightness read as dyed. Seeded by index so the
 * assignment is stable across re-renders — no hydration mismatch, no reshuffle
 * on every paint.
 *
 * CONTRAST IS THE CONSTRAINT, and it is why the range here is asymmetric
 * rather than the symmetric ±3% you might expect.
 *
 * Base terracotta #C1440E is hsl(18 87% 41%) and carries 5.0:1 against white
 * text — comfortably AA. Drifting *lighter* eats that margin fast: hsl(18 87%
 * 44%) measures 4.47:1 and fails. So lightness only ever moves down from the
 * certified base, never up, which means every lot in the rotation is at least
 * as legible as the colour already signed off in globals.css.
 *
 * Hue drift is capped at ±3°. The worst case (hue 21 at base lightness) is
 * ~4.7:1, still AA.
 *
 * Even so: these are for DECORATIVE fills — accent rules, swatches, chips with
 * no text on them. Semantic colour (tier badges, success/warning states) must
 * never drift, because there the exact hue *is* the information.
 */

import { hash } from "./rough";

export type DyeLot = { h: number; s: number; l: number };

/** Base hues, matched to the palette in tailwind.config.ts. */
const BASE = {
  terracotta: { h: 18, s: 87, l: 41 },
  haldi: { h: 39, s: 82, l: 50 },
  teal: { h: 185, s: 59, l: 30 },
  indigo: { h: 239, s: 52, l: 38 },
} as const;

export type DyeBase = keyof typeof BASE;

/**
 * Deterministic lot for one instance. `index` is the sibling position;
 * `seed` separates independent rotations on the same page.
 */
export function dyeLot(index: number, base: DyeBase = "terracotta", seed = 0): DyeLot {
  const b = BASE[base];
  const h = hash(index, seed + 31);
  // Hue: ±3°, integer.
  const hueShift = (h % 7) - 3;
  // Lightness: −5%..0%. Never above the certified base — see the note above.
  const ligShift = -((h >>> 8) % 6);
  return { h: b.h + hueShift, s: b.s, l: b.l + ligShift };
}

/** CSS colour for one instance. */
export function dyeLotColor(index: number, base: DyeBase = "terracotta", seed = 0): string {
  const { h, s, l } = dyeLot(index, base, seed);
  return `hsl(${h} ${s}% ${l}%)`;
}

/** Colours for `count` consecutive instances — the list-level convenience. */
export function dyeLotColors(count: number, base: DyeBase = "terracotta", seed = 0): string[] {
  return Array.from({ length: count }, (_, i) => dyeLotColor(i, base, seed));
}
