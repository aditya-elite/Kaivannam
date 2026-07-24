"use client";

import { useEffect, useRef, useState } from "react";
import { markAnimating, setPathLength } from "./motion";

/**
 * §6.4 — thread-snap, the seal confirmation.
 *
 * Sealing a product is the emotional counterpart to verifying one: weeks of
 * documentation resolving into a permanent record. It previously just disabled
 * a button. A thread pulling taut and knotting is the seal's own vocabulary,
 * used at the far end of the journey.
 *
 * Runs once, ~940ms, then stops. Nothing loops. The confirmation text and the
 * product ID are in the DOM and announced independently of this — the animation
 * is never what tells the artisan the work succeeded.
 */
export function ThreadSnap({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const path = pathRef.current;
    if (path) {
      setPathLength(path);
      markAnimating(path);
    }
    // Next frame, so the start state paints before the animation begins —
    // otherwise the browser can collapse both into one style resolution and
    // the draw is skipped entirely.
    const id = requestAnimationFrame(() => setPlaying(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 120"
      width="100%"
      height="96"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`thread-snap text-terracotta ${playing ? "is-playing" : ""} ${className}`}
    >
      <path
        ref={pathRef}
        className="snap-line"
        d="M10,60 C90,20 150,100 200,60 C250,20 310,100 390,60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g className="text-haldi" fill="currentColor">
        {/* Knots land along the thread, 80ms apart, after the draw completes. */}
        <circle className="snap-knot" style={{ "--n": 0 } as React.CSSProperties} cx="115" cy="52" r="5" />
        <circle className="snap-knot" style={{ "--n": 1 } as React.CSSProperties} cx="200" cy="60" r="5.5" />
        <circle className="snap-knot" style={{ "--n": 2 } as React.CSSProperties} cx="290" cy="68" r="5" />
      </g>
    </svg>
  );
}
