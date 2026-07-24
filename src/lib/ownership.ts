import { ownershipDb } from "./ownership-db";
import type { OwnershipEntry, TransferRequest } from "@prisma/client";

/**
 * LAYER 2 — custody / ownership transfer.
 *
 * This module imports ONLY `ownershipDb`, the capability boundary. It therefore
 * cannot write to, alter or re-hash anything in the authenticity core — not by
 * agreement, but because it holds no handle that could. Read Section 0 of the
 * feature brief and lib/ownership-db for why this matters.
 *
 * "Current owner" is computed from the log on read — the latest entry — never
 * stored as a mutable field. Every transfer APPENDS; nothing is ever edited.
 * Recipients must ACCEPT before custody moves (two-sided handshake), enforced
 * here on the server; client checks are UX only.
 */

const norm = (s: string) => s.trim().toLowerCase();

export type OwnershipView = {
  currentOwner: string | null;
  transferCount: number; // number of custody changes after genesis
  log: Array<{
    seq: number;
    fromParty: string | null;
    toParty: string;
    note: string | null;
    at: Date;
    isGenesis: boolean;
  }>;
};

/** The current holder — the latest custody entry's recipient. */
export async function getCurrentOwner(productId: string): Promise<string | null> {
  const latest = await ownershipDb.latestEntry(productId);
  return latest?.toParty ?? null;
}

/** The full custody log + a computed current owner, for display. */
export async function getOwnership(productId: string): Promise<OwnershipView> {
  const entries = await ownershipDb.listEntries(productId);
  return {
    currentOwner: entries.length ? entries[entries.length - 1].toParty : null,
    transferCount: Math.max(0, entries.length - 1),
    log: entries.map((e) => ({
      seq: e.seq,
      fromParty: e.fromParty,
      toParty: e.toParty,
      note: e.note,
      at: e.createdAt,
      isGenesis: e.seq === 1,
    })),
  };
}

/**
 * Seed the genesis custody entry — the maker holds the item at registration.
 * Called once at seal. No-op if a log already exists.
 */
export async function ensureGenesisOwner(productId: string): Promise<OwnershipEntry | null> {
  const existing = await ownershipDb.latestEntry(productId);
  if (existing) return existing;
  const maker = await ownershipDb.productMaker(productId);
  if (!maker) return null;
  return ownershipDb.appendEntry({
    productId,
    fromParty: null,
    toParty: maker.makerName,
    note: "Registered by the maker",
  });
}

export type InitiateResult =
  | { ok: true; request: TransferRequest }
  | { ok: false; error: "not_found" | "not_owner" | "already_pending" | "same_party" | "invalid" };

/**
 * The current owner proposes a transfer to a recipient. Creates a PENDING
 * request; nothing moves until the recipient accepts. Only the current owner
 * may initiate — checked against the latest log entry, server-side.
 */
export async function initiateTransfer(input: {
  productId: string;
  actor: string; // the party attempting the transfer
  toParty: string;
  note?: string | null;
}): Promise<InitiateResult> {
  const to = input.toParty?.trim();
  if (!to || !input.actor?.trim()) return { ok: false, error: "invalid" };

  const latest = await ownershipDb.latestEntry(input.productId);
  if (!latest) return { ok: false, error: "not_found" };

  // ENFORCEMENT: only the current owner can initiate.
  if (norm(latest.toParty) !== norm(input.actor)) return { ok: false, error: "not_owner" };
  if (norm(latest.toParty) === norm(to)) return { ok: false, error: "same_party" };

  // One live handshake at a time.
  const pending = await ownershipDb.listRequests(input.productId, "PENDING");
  if (pending.length > 0) return { ok: false, error: "already_pending" };

  const request = await ownershipDb.createTransferRequest({
    productId: input.productId,
    fromParty: latest.toParty,
    toParty: to,
    note: input.note ?? null,
  });
  return { ok: true, request };
}

export type AcceptResult =
  | { ok: true; entry: OwnershipEntry }
  | { ok: false; error: "not_found" | "not_pending" | "not_recipient" | "owner_changed" };

/**
 * The recipient accepts. Only now is a new custody entry APPENDED. Re-checks,
 * server-side, that the request is still pending, that the accepting party is
 * the invited recipient, and that the owner has not changed underneath.
 */
export async function acceptTransfer(input: {
  requestId: string;
  actor: string; // the party accepting — must be the invited recipient
}): Promise<AcceptResult> {
  const request = await ownershipDb.getTransferRequest(input.requestId);
  if (!request) return { ok: false, error: "not_found" };
  if (request.status !== "PENDING") return { ok: false, error: "not_pending" };
  if (norm(request.toParty) !== norm(input.actor)) return { ok: false, error: "not_recipient" };

  const latest = await ownershipDb.latestEntry(request.productId);
  if (!latest || norm(latest.toParty) !== norm(request.fromParty)) {
    // The owner changed since the request was raised — refuse and close it.
    await ownershipDb.setRequestStatus(request.id, "CANCELLED");
    return { ok: false, error: "owner_changed" };
  }

  const entry = await ownershipDb.appendEntry({
    productId: request.productId,
    fromParty: request.fromParty,
    toParty: request.toParty,
    note: request.note,
  });
  await ownershipDb.setRequestStatus(request.id, "ACCEPTED");
  return { ok: true, entry };
}

/** The recipient declines, or the owner cancels. Either way, no entry is added. */
export async function resolveTransfer(
  requestId: string,
  outcome: "DECLINED" | "CANCELLED",
): Promise<TransferRequest | null> {
  const request = await ownershipDb.getTransferRequest(requestId);
  if (!request || request.status !== "PENDING") return null;
  return ownershipDb.setRequestStatus(requestId, outcome);
}

/** Pending handshake for a product, if any. */
export async function getPendingTransfer(productId: string): Promise<TransferRequest | null> {
  const pending = await ownershipDb.listRequests(productId, "PENDING");
  return pending[0] ?? null;
}
