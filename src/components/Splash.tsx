"use client";

import { useEffect, useState } from "react";

/**
 * Craft splash — float + thread shimmer + staggered letter reveal, on the
 * Kaivannam palette. Shows once per browser session, auto-dismisses, and is
 * fully disabled for users who prefer reduced motion (handled in globals.css).
 *
 * The wordmark is Latin. It was previously set in Devanagari, which had two
 * problems: it is the brand name in a script most visitors cannot read as a
 * *name*, and `split("")` on Devanagari splits combining marks off their base
 * consonant — the per-letter stagger was rendering broken clusters. Latin
 * splits cleanly into one glyph per span. The three scripts still appear
 * together in the tagline below, which is where the multilingual promise
 * belongs.
 */
const WORD = "Kaivannam";

export function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ks_splash_seen")) return;
    sessionStorage.setItem("ks_splash_seen", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 2700);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="splash" role="status" aria-label="Kaivannam is loading">
      <div className="splash__word" aria-hidden="true">
        {[...WORD].map((ch, i) => (
          <span
            key={i}
            className="splash__thread"
            style={{ animationDelay: `${0.15 + i * 0.07}s` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className="splash__tagline">कैवण्णम् · கைவண்ணம் · Proof of the hand</div>
    </div>
  );
}
