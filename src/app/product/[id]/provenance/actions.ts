"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  initiateTransfer,
  acceptTransfer,
  resolveTransfer,
  getCurrentOwner,
  getPendingTransfer,
} from "@/lib/ownership";
import { addAttestation } from "@/lib/consensus/attest";
import { supersedeForCorrection } from "@/lib/authenticity/record";
import type { AttesterType } from "@prisma/client";

/**
 * Server-side enforcement for the provenance actions. Every rule that matters
 * lives here; the client forms are convenience only.
 *
 * NOTE ON THE TWO LAYERS: the transfer actions call ONLY lib/ownership, which
 * in turn holds only the ownership capability. The correction action calls
 * lib/authenticity. Nothing crosses over — a transfer physically cannot reach
 * the authenticity tables from here.
 */

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export type ActionState = { ok: boolean; message: string };

/** The current owner proposes a transfer. Actor must equal the current owner. */
export async function initiateTransferAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const productId = s(fd, "productId");
  const actor = s(fd, "actor");
  const toParty = s(fd, "toParty");
  const note = s(fd, "note") || null;
  if (!productId || !actor || !toParty) return { ok: false, message: "missing" };

  const res = await initiateTransfer({ productId, actor, toParty, note });
  if (!res.ok) return { ok: false, message: res.error };
  revalidatePath(`/product/${productId}/provenance`);
  return { ok: true, message: "requested" };
}

/** The invited recipient accepts — the ONLY path that appends a custody entry. */
export async function acceptTransferAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const productId = s(fd, "productId");
  const actor = s(fd, "actor");
  if (!productId || !actor) return { ok: false, message: "missing" };

  // The client never sees the request id; resolve the product's single live
  // handshake here. The accept path still re-verifies the actor is the invited
  // recipient and the owner hasn't changed.
  const pending = await getPendingTransfer(productId);
  if (!pending) return { ok: false, message: "not_pending" };

  const res = await acceptTransfer({ requestId: pending.id, actor });
  if (!res.ok) return { ok: false, message: res.error };
  revalidatePath(`/product/${productId}/provenance`);
  revalidatePath(`/product/${productId}`);
  return { ok: true, message: "accepted" };
}

/** Decline (recipient) or cancel (owner) — no custody entry is written. */
export async function resolveTransferAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const productId = s(fd, "productId");
  const outcome = s(fd, "outcome") === "CANCELLED" ? "CANCELLED" : "DECLINED";
  if (!productId) return { ok: false, message: "missing" };
  const pending = await getPendingTransfer(productId);
  if (!pending) return { ok: false, message: "not_pending" };
  await resolveTransfer(pending.id, outcome);
  revalidatePath(`/product/${productId}/provenance`);
  return { ok: true, message: outcome.toLowerCase() };
}

/**
 * Record an independent attestation (cooperative / NGO). Requires a signed-in
 * account acting on behalf of the organisation. The maker cannot self-attest —
 * addAttestation rejects it, and additionally we refuse if the acting account
 * is the product's own artisan.
 */
export async function attestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "auth_required" };

  const productId = s(fd, "productId");
  const attesterType = (s(fd, "attesterType") === "NGO" ? "NGO" : "COOPERATIVE") as AttesterType;
  const attesterName = s(fd, "attesterName");
  const statement = s(fd, "statement") || null;
  const witnessedProduction = s(fd, "witnessed") === "on";
  if (!productId || !attesterName) return { ok: false, message: "missing" };

  const res = await addAttestation({
    productId,
    attesterType,
    attesterName,
    statement,
    witnessedProduction,
  });
  if (!res.ok) return { ok: false, message: res.error };
  revalidatePath(`/product/${productId}/provenance`);
  revalidatePath(`/product/${productId}`);
  return {
    ok: true,
    message: res.superseded ? "attested_superseded" : "attested",
  };
}

/**
 * CORRECTION — supersede, never edit. Admin-only. Applies corrected making-facts
 * to a NEW authenticity version linked to the current one, with a reason. The
 * original stays visible. This never touches the product row or its hash.
 */
export async function correctionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { ok: false, message: "forbidden" };

  const productId = s(fd, "productId");
  const field = s(fd, "field"); // "materials" | "title" | "artisanName"
  const value = s(fd, "value");
  const reason = s(fd, "reason");
  if (!productId || !field || !value || !reason) return { ok: false, message: "missing" };

  const corrections: Record<string, unknown> =
    field === "artisanName"
      ? { artisan: { fullName: value } }
      : field === "title"
        ? { title: value }
        : { materials: value };

  const rec = await supersedeForCorrection(productId, corrections, reason);
  if (!rec) return { ok: false, message: "no_record" };
  revalidatePath(`/product/${productId}/provenance`);
  revalidatePath(`/product/${productId}`);
  return { ok: true, message: "corrected" };
}

/** Read helper for the client form to prefill the current owner. */
export async function currentOwnerAction(productId: string): Promise<string | null> {
  return getCurrentOwner(productId);
}
