"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * §4.3 — sheared pattern-wipe page transition.
 *
 * Only the wipe-*out* is implemented, and deliberately so: it fires at the new
 * route's first paint. Running a wipe-*in* would mean holding navigation open
 * long enough to watch it, which gates content — forbidden by §0 and by §4.3's
 * own "never delay content availability".
 *
 * The overlay is pointer-events: none from the first frame, unmounts on a hard
 * 600ms timeout whatever happens, and never waits on the network. If it failed
 * entirely the app would be indistinguishable except for the missing sweep.
 */
export function PageWipe() {
  const pathname = usePathname();
  const first = useRef(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // The initial load already has the splash; a wipe on top of it is noise.
    if (first.current) {
      first.current = false;
      return;
    }
    setPlaying(true);
    const stop = window.setTimeout(() => setPlaying(false), 600);
    return () => window.clearTimeout(stop);
  }, [pathname]);

  if (!playing) return null;

  return (
    <div className="pattern-wipe is-out" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="none" focusable="false">
        <defs>
          {/* Repeating block-print motif column. One tile, tiled by the browser
              — no image request, a few hundred bytes of markup. */}
          <pattern id="wipe-motif" width="44" height="44" patternUnits="userSpaceOnUse">
            <rect width="44" height="44" fill="#2E3192" />
            <circle cx="22" cy="22" r="7" fill="none" stroke="#E9A319" strokeWidth="1.5" opacity="0.7" />
            <path d="M22,6 L28,15 L22,24 L16,15 Z" fill="#C1440E" opacity="0.85" />
            <path d="M22,20 L28,29 L22,38 L16,29 Z" fill="#E9A319" opacity="0.5" />
            <circle cx="4" cy="4" r="1.6" fill="#FDF8F0" opacity="0.5" />
            <circle cx="40" cy="40" r="1.6" fill="#FDF8F0" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wipe-motif)" />
      </svg>
    </div>
  );
}
