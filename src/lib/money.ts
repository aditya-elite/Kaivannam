/**
 * Money helpers. All amounts are stored as integer paise (₹1 = 100 paise) to
 * avoid floating-point rounding on prices and totals.
 */

/** Format paise as an Indian-rupee string, e.g. 245000 → "₹2,450". */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Parse a rupee input (string or number) to integer paise; null if invalid. */
export function rupeesToPaise(input: string | number): number | null {
  const n = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
