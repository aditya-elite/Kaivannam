"use client";

import { useEffect, useRef, useState } from "react";
import { markAnimating } from "./motion";

/**
 * §3.5 — kolam divider that draws when scrolled into view.
 *
 * One continuous path. Kolam is traditionally drawn unbroken and a single path
 * reads correctly; splitting it into segments does not. Stroke stays at 2px —
 * below 1.5px the line vanishes on low-DPI screens.
 *
 * Duration is derived from the measured path length, clamped to 400–900ms.
 * Runs once, unobserves immediately, never replays on scroll-back.
 */
const PATH =
  "M4,32 C4,16 20,4 36,4 C52,4 68,16 68,32 C68,48 52,60 36,60 C20,60 4,48 4,32 " +
  "M36,4 C52,4 68,16 68,32 M20,18 C36,10 52,26 68,32 M20,46 C36,54 52,38 68,32 " +
  "M36,60 C20,60 4,48 4,32";

export function Kolam({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const svg = ref.current;
    const path = pathRef.current;
    if (!svg || !path) return;

    let len = 620;
    try {
      len = Math.ceil(path.getTotalLength());
    } catch {
      /* fall back to the CSS default */
    }
    path.style.setProperty("--len", String(len));
    // duration = clamp(400, pathLength * 1.6, 900)
    svg.style.setProperty("--kolam-dur", `${Math.min(900, Math.max(400, len * 1.6))}ms`);

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          io.disconnect();
          markAnimating(path);
          setVisible(true);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`flex justify-center py-8 ${className}`} aria-hidden="true">
      <svg
        ref={ref}
        width="240"
        height="44"
        viewBox="0 0 216 64"
        fill="none"
        focusable="false"
        className={`kolam text-terracotta ${visible ? "is-visible" : ""}`}
      >
        {/* Repeated across the rule so the divider spans the column, drawn as
            one path per motif with the connecting rule between them. */}
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55">
          <path ref={pathRef} d={PATH} transform="translate(74 0)" />
          <line x1="6" y1="32" x2="72" y2="32" />
          <line x1="144" y1="32" x2="210" y2="32" />
        </g>
      </svg>
    </div>
  );
}
