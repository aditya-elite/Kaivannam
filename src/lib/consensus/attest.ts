import { db } from "../db";
import { recomputeAndSupersedeIfChanged } from "../authenticity/record";
import type { AttesterType } from "@prisma/client";

/**
 * Recording an independent attestation.
 *
 * An attestation is a separate append-only record — an INPUT the consensus
 * scorer reads. Adding one never edits the frozen authenticity record; instead
 * it triggers a supersede that appends a new, higher-scored version.
 *
 * Independence is enforced at the point of writing, not just at scoring time:
 * an attester whose name is the product's own maker is rejected outright, so a
 * vendor can't create a self-attestation record at all. This is the structural
 * reason the vendor cannot inflate their own score.
 */

export type AttestInput = {
  productId: string;
  attesterType: AttesterType;
  attesterName: string;
  attesterRef?: string | null;
  statement?: string | null;
  witnessedProduction?: boolean;
};

export type AttestResult =
  | { ok: true; attestationId: string; superseded: boolean; newScore: number | null }
  | { ok: false; error: "product_not_found" | "not_sealed" | "self_attestation" | "invalid" };

const norm = (s: string) => s.trim().toLowerCase();

export async function addAttestation(input: AttestInput): Promise<AttestResult> {
  const name = input.attesterName?.trim();
  if (!name) return { ok: false, error: "invalid" };

  const product = await db.product.findUnique({
    where: { id: input.productId },
    include: { artisan: true },
  });
  if (!product) return { ok: false, error: "product_not_found" };
  // Attestations attach to a sealed record — there is nothing frozen to
  // supersede before seal.
  if (product.status !== "SEALED") return { ok: false, error: "not_sealed" };

  // INDEPENDENCE GUARD — the maker cannot vouch for their own item.
  if (norm(name) === norm(product.artisan.fullName)) {
    return { ok: false, error: "self_attestation" };
  }

  const attestation = await db.attestation.create({
    data: {
      productId: input.productId,
      attesterType: input.attesterType,
      attesterName: name,
      attesterRef: input.attesterRef?.trim() || null,
      statement: input.statement?.trim() || null,
      witnessedProduction: !!input.witnessedProduction,
    },
  });

  // The new independent evidence supersedes the frozen record with a higher score.
  const { version, superseded } = await recomputeAndSupersedeIfChanged(input.productId);

  return {
    ok: true,
    attestationId: attestation.id,
    superseded,
    newScore: version?.trustScore ?? null,
  };
}

/** Withdraw an attestation (marks it revoked; it stops counting on next recompute). */
export async function revokeAttestation(attestationId: string): Promise<void> {
  await db.attestation.update({
    where: { id: attestationId },
    data: { revokedAt: new Date() },
  });
}
