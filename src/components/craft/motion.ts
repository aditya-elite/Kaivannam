"use client";

import { useEffect, useState } from "react";

/**
 * Reads the OS reduced-motion setting for the handful of places where the
 * decision has to be made in JS rather than CSS (sequence timing, whether to
 * run a page wipe at all). CSS handles the rest — see motion.css.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * `will-change: transform` is added only while an element is animating and
 * dropped on completion — leaving it on permanently costs memory on exactly
 * the low-end devices this product targets.
 */
export function markAnimating(el: HTMLElement | SVGElement) {
  el.style.willChange = "transform, opacity";
  const clear = () => {
    el.style.willChange = "";
    el.removeEventListener("transitionend", clear);
    el.removeEventListener("animationend", clear);
  };
  el.addEventListener("transitionend", clear);
  el.addEventListener("animationend", clear);
  // Backstop for elements whose transition never fires (e.g. no property change).
  window.setTimeout(clear, 1800);
}

/** Sets --len on a stroke-drawn path so dash animations know their length. */
export function setPathLength(el: SVGGeometryElement | null) {
  if (!el) return;
  try {
    const len = Math.ceil(el.getTotalLength());
    el.style.setProperty("--len", String(len));
  } catch {
    /* getTotalLength can throw on detached nodes; the CSS fallback covers it. */
  }
}
