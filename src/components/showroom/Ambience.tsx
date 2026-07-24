"use client";

import { useEffect, useState } from "react";

/**
 * §10.1–10.3 — the room itself.
 *
 * Everything here is gradients and transforms. There is no photograph of a
 * boutique interior anywhere in this component, and that is deliberate: a
 * convincing room built from imagery would cost more to download than the
 * entire rest of the page, on connections where the page is already the
 * expensive part. Warm light, depth and dust are cheap to fake and expensive
 * to photograph.
 *
 * The whole thing is decorative and `aria-hidden`. A screen reader user
 * standing in this room hears the products, not the lamps.
 */

/* Eight motes. Past a dozen it stops reading as air and starts reading as
   snow. Positions and periods are hand-placed rather than random so the
   distribution is deliberate and stable across renders. */
const MOTES = [
  { left: "8%",  bottom: "6%",  size: 3, dur: 19, delay: 0,   x: 34 },
  { left: "21%", bottom: "18%", size: 2, dur: 24, delay: 3.5, x: -22 },
  { left: "34%", bottom: "2%",  size: 4, dur: 16, delay: 7,   x: 48 },
  { left: "48%", bottom: "26%", size: 2, dur: 27, delay: 1.5, x: -30 },
  { left: "61%", bottom: "10%", size: 3, dur: 21, delay: 9,   x: 26 },
  { left: "74%", bottom: "22%", size: 2, dur: 18, delay: 5,   x: -18 },
  { left: "86%", bottom: "4%",  size: 3, dur: 25, delay: 12,  x: 40 },
  { left: "94%", bottom: "30%", size: 2, dur: 22, delay: 2,   x: -26 },
];

export function Ambience() {
  // The dust is the only part that is not free: eight elements animating
  // forever. It is mounted after first paint so it never competes with the
  // page becoming readable, and it is skipped entirely on coarse pointers
  // with a narrow viewport — on a phone the motes are sub-pixel decoration
  // that costs real battery.
  const [dust, setDust] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 640px)").matches) return;
    const id = window.setTimeout(() => setDust(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div aria-hidden="true">
      {/* §10.1 Fixed ambient wash — ceiling spill, side lamp, floor bounce. */}
      <div className="showroom-light" />

      {/* Deep warm vignette at the edges, so the room has walls. */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 52%, rgba(78,47,20,0.10) 82%, rgba(78,47,20,0.18) 100%)",
        }}
      />

      {/* §10.3 Dust in the light. */}
      {dust ? (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {MOTES.map((m, i) => (
            <span
              key={i}
              className="mote"
              style={
                {
                  left: m.left,
                  bottom: m.bottom,
                  width: m.size,
                  height: m.size,
                  "--mote-dur": `${m.dur}s`,
                  "--mote-delay": `${m.delay}s`,
                  "--mote-x": `${m.x}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * §10.11 — block-print section divider. A stamped motif repeated along the
 * band and masked to nothing at both ends, so it reads as a printed border
 * rather than as a horizontal rule.
 *
 * The motif is an inline data URI (~0.3KB) instead of a request.
 */
const MOTIF =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='26' viewBox='0 0 44 26'%3E%3Cg fill='none' stroke='%23C1440E' stroke-width='1.4'%3E%3Cpath d='M22 3.5 L28.5 13 L22 22.5 L15.5 13 Z'/%3E%3Ccircle cx='22' cy='13' r='2.6'/%3E%3Cpath d='M4 13 h7 M33 13 h7'/%3E%3C/g%3E%3C/svg%3E\")";

export function BlockPrintDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`blockprint my-10 ${className}`}
      style={{ backgroundImage: MOTIF }}
      aria-hidden="true"
    />
  );
}
