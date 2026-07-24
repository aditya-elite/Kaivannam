"use client";

import { useEffect, useState } from "react";
import { tornClass } from "@/lib/rough";

/**
 * §7.2 — torn-edge selection highlight. A paint stroke with irregular, bleeding
 * edges, not a clean rectangle, and it wipes left-to-right so it reads as a
 * brush being drawn rather than a box appearing. Direction matters.
 *
 * The clip variant rotates per instance (§2.3) so repeated selections are never
 * mechanically identical.
 *
 * Contrast: the stroke is haldi #E9A319 and the text above it is ink #2B1D14 —
 * 9.0:1 at the stroke's lightest point, not its average. The spatter dots sit
 * past the trailing edge, clear of the text run, and are pointer-events: none
 * so they never interfere with the target.
 *
 * Purely decorative: `aria-selected` on the row is what communicates selection.
 */
export function TornHighlight({ index = 0 }: { index?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // Next frame, so the transition has a start state to move from.
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span aria-hidden="true" className={`torn-highlight ${on ? "is-on" : ""}`}>
      <span className={`absolute inset-0 bg-haldi ${tornClass(index)}`} />
      {/* Two detached spatter dots near the trailing edge, 40ms behind the
          stroke. Geometry, not motion — they still render under reduced
          motion, just without the delay. */}
      <span className="spatter absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-haldi" />
      <span className="spatter absolute bottom-2 right-3 h-1.5 w-1.5 rounded-full bg-haldi" />
    </span>
  );
}
