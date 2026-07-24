/**
 * Money helpers. All amounts are stored as integer paise (₹1 = 100 paise) to
 * avoid floating-point rounding on prices and totals.
 */

/**
 * Format paise as an Indian-rupee string, e.g. 245000 → "₹2,450".
 *
 * Grouping is done by hand rather than with `toLocaleString("en-IN")`. Intl
 * output depends on the ICU data compiled into each runtime, so a server on a
 * small-ICU Node build and a browser with full ICU can disagree on the same
 * number — and this string is rendered during SSR on every product card and
 * every cart line. React lists locale formatting as a hydration-mismatch cause
 * for exactly this reason, and a mismatch aborts hydration for the whole tree.
 * Plain arithmetic is identical everywhere.
 *
 * Indian grouping: last three digits, then pairs. 12500000 → "1,25,00,000".
 */
export function formatINR(paise: number): string {
  const neg = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const pennies = abs % 100;

  const s = String(rupees);
  const grouped =
    s.length <= 3
      ? s
      : s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);

  // Paise are shown only when they are non-zero, matching the previous behaviour.
  const frac = pennies === 0 ? "" : "." + String(pennies).padStart(2, "0");
  return (neg ? "-₹" : "₹") + grouped + frac;
}

/** Parse a rupee input (string or number) to integer paise; null if invalid. */
export function rupeesToPaise(input: string | number): number | null {
  const n = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
