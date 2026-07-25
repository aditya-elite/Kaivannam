/**
 * A GI number that lets the register flow run without a certificate image: it
 * matches the ingested register (seeded like any other entry) AND the register
 * flow waives the cert-image requirement for it, so ANY image — or no image at
 * all — is accepted.
 *
 * This module is intentionally dependency-free (no `db`, no server-only imports)
 * so both the server route and the client register form can share the same
 * constant + check without pulling the database into the client bundle.
 */
export const DEMO_GI_NUMBER = "GI-0635";

/** Normalise exactly like lib/gi.normalizeGiNumber so the two never diverge. */
export function normalizeGi(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** True when the entered number is the demo sentinel (case/space-insensitive). */
export function isDemoGiNumber(input: string | null | undefined): boolean {
  return !!input && normalizeGi(input) === DEMO_GI_NUMBER;
}
