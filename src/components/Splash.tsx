"use client";

import { useEffect, useState } from "react";

/**
 * Craft splash — mechanics adapted from the provided animation.css (float +
 * thread shimmer + staggered reveal), re-skinned to the Kalāsūtra palette and
 * wordmark. Shows once per browser session, auto-dismisses, and is fully
 * disabled for users who prefer reduced motion (handled in globals.css).
 */
const WORD = "कलासूत्र";

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
    <div className="splash" role="status" aria-label="Kalāsūtra is loading">
      <div className="splash__word" aria-hidden="true">
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            className="splash__thread font-deva"
            style={{ animationDelay: `${0.15 + i * 0.09}s` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className="splash__tagline">Kalāsūtra · कलासूत्र · கலாசூத்ரா</div>
    </div>
  );
}
