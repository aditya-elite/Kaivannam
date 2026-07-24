"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { markAnimating } from "@/components/craft/motion";

/**
 * §10.4–10.5 — a wooden shelf with pieces standing on it.
 *
 * The plank draws out from its centre as the shelf comes into view, then the
 * pieces settle onto it left to right. It runs once and unobserves, like every
 * other reveal in this codebase.
 *
 * Structural note: the plank is rendered *after* the row in the DOM and pulled
 * up visually. That way the reveal reads as objects landing on a surface that
 * is already there, and — more importantly — the shelf furniture never sits
 * between two products in the reading order.
 */
export function Shelf({
  children,
  className = "",
  plank = true,
}: {
  children: ReactNode;
  className?: string;
  /** Set false for rows that should reveal without shelf furniture. */
  plank?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
          markAnimating(el);
          setVisible(true);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`shelf-reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
      {plank ? (
        <div aria-hidden="true" className="mt-1">
          <div className="shelf-contact" />
          <div className="shelf-plank" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One piece standing on the shelf. `index` drives the left-to-right settle.
 * Capped at 6 so a long row never grows an absurd delay or puts more than a
 * handful of elements in flight at once.
 */
export function ShelfItem({
  index = 0,
  className = "",
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`shelf-item ${className}`}
      style={{ "--i": Math.min(index, 6) } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
