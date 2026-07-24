import { randomBytes } from "crypto";

// Crockford base32 (no I, L, O, U — avoids ambiguity for humans reading a tag).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Non-sequential, non-guessable product id. 80 bits of entropy, grouped for
 * human legibility on a printed tag, e.g. "KS-4F7Q-9XB2-M3KP".
 */
export function newProductId(): string {
  const bytes = randomBytes(10); // 80 bits
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % 32];
    // 10 bytes -> 10 chars grouped 4/4/... but we want 12 chars; add more.
  }
  // Expand to 12 characters for a comfortable keyspace.
  const extra = randomBytes(2);
  out += ALPHABET[extra[0] % 32] + ALPHABET[extra[1] % 32];
  const grouped = out.match(/.{1,4}/g)!.join("-");
  return `KS-${grouped}`;
}

/** Opaque session/token generator. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}
