"use client";

import { useEffect, useRef, useState } from "react";

/**
 * §2.1 + §7.3 — the sheared bar. A parallelogram, never a rectangle, filled by
 * transform: scaleX() from the left origin. `width` is never animated.
 *
 * Two rules hold the type together:
 *   · The numeric label sits outside the scaling element, so it neither
 *     stretches with the fill nor drifts as the value changes.
 *   · Every glyph is counter-sheared. Skewed text damages legibility badly and
 *     Tamil and Devanagari suffer worse than Latin, so this is not negotiable.
 */
export function ShearBar({
  value,
  label,
  valueLabel,
}: {
  /** 0–1. */
  value: number;
  label: string;
  /** e.g. "3 of 4". Rendered as text, never inferred from the bar. */
  valueLabel: string;
}) {
  const [fill, setFill] = useState(0);
  const pct = Math.max(0, Math.min(1, value));
  const raf = useRef<number>(0);

  // Start at zero, then hand the target to the browser on the next frame so the
  // transition actually runs. (Under reduced motion the transition is disabled
  // in motion.css and this simply lands at the final value.)
  useEffect(() => {
    raf.current = requestAnimationFrame(() => setFill(pct));
    return () => cancelAnimationFrame(raf.current);
  }, [pct]);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="type-label text-muted">{label}</span>
        <span className="text-sm font-semibold text-ink">{valueLabel}</span>
      </div>
      <div
        className="shear-bar h-3 overflow-hidden rounded-[2px] bg-ink/10"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${valueLabel}`}
      >
        {/* The fill carries no text, so it deliberately keeps the parent's shear
            — its leading edge is the diagonal. The counter-skew rule exists for
            glyphs, and the labels above sit outside the sheared box entirely. */}
        <div className="bar-fill h-full bg-teal" style={{ transform: `scaleX(${fill})` }} />
      </div>
    </div>
  );
}
