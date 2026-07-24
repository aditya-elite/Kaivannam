"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * §3.1 — the warp-and-weft hero reveal. The one feature animation on this
 * screen.
 *
 *   Phase 1  0–500ms   warp threads draw top-to-bottom, staggered 40ms
 *   Phase 2  400–900ms weft threads draw left-to-right, staggered 50ms
 *   Phase 3  850ms+    headline and subhead fade up 12px, 80ms apart
 *
 * Runs once per session — the flag is persisted so back-navigation does not
 * replay it. On every subsequent visit the threads are simply drawn.
 *
 * Nothing here gates content. The children are in the DOM and interactive from
 * frame one; the animation only touches opacity and transform. If it failed the
 * hero would look finished rather than broken.
 *
 * `pathLength` normalises every line so stroke-dashoffset works without
 * measuring anything in JS.
 */
const WARP = 9;
const WEFT = 6;
const SESSION_KEY = "ks_hero_woven";

export function HeroWeave({ children }: { children: ReactNode }) {
  // Server and first client render agree on "static"; the upgrade to "playing"
  // happens in an effect, so there is no hydration mismatch.
  const [mode, setMode] = useState<"static" | "playing">("static");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode / storage disabled — just play it. */
    }
    setMode("playing");
  }, []);

  return (
    <div className={`hero-weave relative ${mode === "playing" ? "is-playing" : "is-static"}`}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <g className="warp" stroke="#FDF8F0" strokeWidth="0.35" opacity="0.4">
          {Array.from({ length: WARP }, (_, i) => (
            <line
              key={i}
              x1={(i + 1) * (100 / (WARP + 1))}
              y1="0"
              x2={(i + 1) * (100 / (WARP + 1))}
              y2="100"
              pathLength={100}
              style={{ "--len": 100, "--delay": `${i * 40}ms` } as React.CSSProperties}
            />
          ))}
        </g>
        <g className="weft" stroke="#E9A319" strokeWidth="0.3" opacity="0.45">
          {Array.from({ length: WEFT }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1={(i + 1) * (100 / (WEFT + 1))}
              x2="100"
              y2={(i + 1) * (100 / (WEFT + 1))}
              pathLength={100}
              style={{ "--len": 100, "--delay": `${400 + i * 50}ms` } as React.CSSProperties}
            />
          ))}
        </g>
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
