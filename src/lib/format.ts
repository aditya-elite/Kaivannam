// Dates are ALWAYS DD/MM/YYYY. Currency is ₹ with Indian digit grouping.

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * ₹ with Indian digit grouping: last three digits, then pairs.
 *   999 → ₹999 · 28500 → ₹28,500 · 120000 → ₹1,20,000 · 12500000 → ₹1,25,00,000
 *
 * Implemented by hand rather than with `Intl.NumberFormat("en-IN")`. Intl
 * output depends on the ICU data built into each runtime, so a server on a
 * small-ICU Node build and a browser with full ICU can disagree on the same
 * number — and this string is rendered during SSR on every product card.
 * React lists locale formatting as a hydration-mismatch cause for exactly this
 * reason. Plain arithmetic is identical everywhere.
 */
export function formatRupees(amount: number): string {
  const n = Math.round(Math.abs(amount));
  const s = String(n);
  let grouped: string;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    // Everything above the last three digits groups in pairs, right to left.
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return (amount < 0 ? "-₹" : "₹") + grouped;
}
