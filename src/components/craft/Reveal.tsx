"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { markAnimating } from "./motion";

/**
 * §3.3 — block-print stamp entrance, the default scroll reveal.
 *
 * IntersectionObserver only, never a scroll listener. Runs once and unobserves
 * immediately — no replay on scroll-back.
 *
 * Nothing here gates content: the child is in the DOM, in the accessible tree
 * and interactive from first paint. Only `opacity`/`transform` are involved, so
 * with CSS disabled the element simply renders in place.
 */
export function Reveal({
  as: Tag = "div",
  index = 0,
  cols = 1,
  bleed = false,
  className = "",
  children,
}: {
  as?: ElementType;
  /** Sibling position — drives the stagger. */
  index?: number;
  /**
   * Columns in the containing grid. With `cols > 1` the stagger runs along
   * the diagonal instead of down the DOM order — see below.
   */
  cols?: number;
  /** Optional ink-bleed ghost (§3.3). Skip on lists over 6 items. */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IO (very old browsers): show immediately rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          io.disconnect();
          markAnimating(el);
          setVisible(true);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Stagger by *position*, not DOM order.
  //
  // A flat `index * 70ms` down a grid reads as a queue being processed — item
  // 1, then 2, then 3 — because the eye follows the source order across each
  // row. Delaying on `row + col` instead sends a wave along the diagonal, and
  // that diagonal is the same axis as the §2.2 spine, so the two devices agree
  // with each other rather than pulling in different directions.
  //
  // Costs exactly the same as the flat version: one number, no extra elements.
  const step = cols > 1 ? Math.floor(index / cols) + (index % cols) : index;
  // Capped so a long list never grows an absurd delay and never puts more than
  // a handful of elements in flight at once (perf budget: max 8 simultaneous).
  const stagger = Math.min(step, 6) * 70;

  return (
    <Tag
      ref={ref}
      style={{ "--stagger": `${stagger}ms` } as React.CSSProperties}
      className={`stamp-in ${bleed ? "ink-bleed" : ""} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
