/**
 * Client-safe Pehchan format + checksum utilities (no DB import).
 *
 * A Pehchan number is a 12-digit national artisan ID whose final digit is a
 * Verhoeff check digit (the scheme Aadhaar uses). These helpers run in the
 * browser (live feedback as the artisan types) and on the server.
 */

// ── Verhoeff checksum (dihedral group D5) ────────────────────────────────────
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** True if `digits` (full number including its check digit) passes Verhoeff. */
function verhoeffValid(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[i % 8][Number(reversed[i])]];
  }
  return c === 0;
}

/**
 * Compute the Verhoeff check digit for a number WITHOUT its check digit. The
 * check digit occupies the units position (permutation index 0), so the payload
 * digits are offset by one — P[(i+1)%8]. This is consistent with verhoeffValid:
 * appending the returned digit makes the full number validate.
 */
export function verhoeffCheckDigit(payload: string): number {
  let c = 0;
  const reversed = payload.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[(i + 1) % 8][Number(reversed[i])]];
  }
  return [0, 4, 3, 2, 1, 5, 6, 7, 8, 9][c];
}

/** Strip spaces/dashes; Pehchan numbers are grouped for legibility on the card. */
export function normalizePehchan(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export type PehchanFormat = {
  normalized: string;
  formatOk: boolean;
  reason?: "length" | "digits" | "leading" | "checksum";
};

/** Offline format + checksum check (no DB). */
export function validatePehchanFormat(input: string): PehchanFormat {
  const normalized = normalizePehchan(input);
  if (!/^\d+$/.test(normalized)) return { normalized, formatOk: false, reason: "digits" };
  if (normalized.length !== 12) return { normalized, formatOk: false, reason: "length" };
  // Aadhaar-style: the first digit is never 0 or 1.
  if (normalized[0] === "0" || normalized[0] === "1")
    return { normalized, formatOk: false, reason: "leading" };
  if (!verhoeffValid(normalized)) return { normalized, formatOk: false, reason: "checksum" };
  return { normalized, formatOk: true };
}

/** Mask a Pehchan number for public display: keep only the last 4 digits. */
export function maskPehchan(number: string): string {
  const n = normalizePehchan(number);
  if (n.length < 4) return "••••";
  return `•••• •••• ${n.slice(-4)}`;
}
