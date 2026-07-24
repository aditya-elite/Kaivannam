"use client";

import { useEffect, useRef } from "react";
import { setPathLength } from "./motion";

/**
 * §5.1 — the verification seal.
 *
 * Success: draw (0–700ms) → gold fill (620–940ms) → mark stamps down
 * (820–1140ms) → one optional pulse at 1140ms → stop. Nothing loops. A
 * permanently animating success state reads as pending, not resolved.
 *
 * Alert: no draw, no flash, no shatter. The seal desaturates over 600ms with
 * --ease-heavy and settles 4px. Someone receiving a counterfeit warning already
 * has a bad outcome; the motion must not add panic on top (§5.3).
 *
 * The graphic is decorative throughout — every verdict is carried by text.
 */
export type SealTone = "authentic" | "caution" | "alert";

const tones: Record<SealTone, { ring: string; fill: string; mark: string }> = {
  authentic: { ring: "#1F6F78", fill: "#E9A319", mark: "#1F6F78" },
  caution: { ring: "#8F320A", fill: "#E9A319", mark: "#8F320A" },
  alert: { ring: "#6B5546", fill: "#6B5546", mark: "#6B5546" },
};

export function Seal({ tone = "authentic", size = 132 }: { tone?: SealTone; size?: number }) {
  const ringRef = useRef<SVGPathElement>(null);
  const c = tones[tone];
  const alert = tone === "alert";

  useEffect(() => setPathLength(ringRef.current), []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={alert ? "fail-seal" : "seal-group"}
    >
      {/* Gold wash inside the ring. Kept light so the mark stays legible on it. */}
      <path
        className={alert ? undefined : "seal-fill"}
        d="M110,18 C136,18.5 181,48 184,110 C185,172 145,201 110,202 C75,203 36,171 34,110 C33,48 73,19 110,18 Z"
        fill={c.fill}
        opacity={alert ? 0.12 : 0.26}
      />

      {/* Deliberately not a perfect circle — the wobble is what makes it read as
          struck rather than printed (§2.3 roughness, applied to the path itself
          so it survives on browsers that clip SVG clip-path references oddly). */}
      <path
        ref={ringRef}
        className={alert ? undefined : "seal-ring"}
        d="M110,10 C138,10.5 186,42 189,110 C190,178 148,208 110,209 C72,210 30,176 28,110 C27,44 70,11 110,10 Z"
        stroke={c.ring}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={alert ? undefined : 640}
      />

      {/* Inner keyline — a second, slightly-off ring, as a struck seal has. */}
      <path
        d="M110,34 C133,34 165,60 167,110 C169,160 138,185 110,186 C82,187 51,161 50,110 C49,60 82,34 110,34 Z"
        stroke={c.ring}
        strokeWidth="1.5"
        opacity="0.4"
      />

      <g className={alert ? undefined : "seal-mark"} stroke={c.mark} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        {alert ? (
          // Not an X and not a crack — a plain horizontal bar. Neutral, heavy,
          // unalarming. The words beside it do the work.
          <line x1="74" y1="110" x2="146" y2="110" />
        ) : (
          <polyline points="76,112 100,138 148,82" fill="none" />
        )}
      </g>
    </svg>
  );
}
