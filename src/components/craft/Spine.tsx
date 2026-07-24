"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * §2.2 + §3.4 — the diagonal spine.
 *
 * The column is aligned to a slanted axis while every text baseline stays
 * horizontal. This is the safe half of the reference's diagonal vocabulary: a
 * diagonal *colour split beneath* text is forbidden because contrast becomes
 * unpredictable across the glyph run, but a diagonal *alignment axis* with
 * horizontal text is fine — every glyph sits on a uniform ground.
 *
 * Items enter along the spine axis rather than straight up, so the column
 * assembles as if drawn on its slanted axis. Drift is capped in motion.css
 * (5px per step under 480px) so nothing escapes the viewport at 360px.
 */
export function Spine({
  children,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  /** Slant the other way. */
  reverse?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealing, setRevealing] = useState(false);
  const items = Children.toArray(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealing(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          io.disconnect();
          setRevealing(true);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`spine ${reverse ? "spine-reverse" : ""} ${className}`}>
      {items.map((child, i) => (
        <div
          key={i}
          className={`spine-item ${revealing ? "is-revealing" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
