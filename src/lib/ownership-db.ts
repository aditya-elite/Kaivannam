import { db } from "./db";
import type { OwnershipEntry, TransferRequest, TransferStatus } from "@prisma/client";

/**
 * THE CAPABILITY BOUNDARY between custody (Layer 2) and authenticity (Layer 1).
 *
 * Section 0 requires that the transfer feature have *no write access* to the
 * authenticity core — enforced structurally, not by a promise to be careful.
 * This module is that enforcement in this stack.
 *
 * `ownershipDb` is a frozen object exposing ONLY custody operations. It has no
 * method that writes Product, AuthenticityRecord, Attestation, StageEntry or
 * LedgerEntry. The transfer code (lib/ownership) imports this and nothing else,
 * so it is *incapable* of mutating or re-hashing anything in Layer 1 — there is
 * simply no such method to call. A test asserts the surface never grows one.
 *
 * The single read it is allowed into Layer 1 is a name/existence lookup
 * (`productMaker`), needed to seed the genesis custody entry. It returns plain
 * strings and cannot write.
 *
 * (On-chain analogue, per the brief: authenticity fields are set once at mint
 * with no setter; custody lives in a separate append-only mapping with its own
 * function. This object is the same shape expressed in application code.)
 */

export type OwnershipDb = {
  /** Read the maker's name + confirm the product exists. NO write path to Layer 1. */
  productMaker(productId: string): Promise<{ productId: string; makerName: string } | null>;

  /** Append a custody entry, computing the next seq atomically. Append-only. */
  appendEntry(input: {
    productId: string;
    fromParty: string | null;
    toParty: string;
    note?: string | null;
  }): Promise<OwnershipEntry>;

  latestEntry(productId: string): Promise<OwnershipEntry | null>;
  listEntries(productId: string): Promise<OwnershipEntry[]>;

  createTransferRequest(input: {
    productId: string;
    fromParty: string;
    toParty: string;
    note?: string | null;
  }): Promise<TransferRequest>;
  getTransferRequest(id: string): Promise<TransferRequest | null>;
  listRequests(productId: string, status?: TransferStatus): Promise<TransferRequest[]>;
  setRequestStatus(id: string, status: TransferStatus): Promise<TransferRequest>;
};

export const ownershipDb: OwnershipDb = Object.freeze({
  async productMaker(productId) {
    const p = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, artisan: { select: { fullName: true } } },
    });
    return p ? { productId: p.id, makerName: p.artisan.fullName } : null;
  },

  async appendEntry(input) {
    // Serialise so seq stays gap-free and unique even under concurrent appends.
    return db.$transaction(async (tx) => {
      const last = await tx.ownershipEntry.findFirst({
        where: { productId: input.productId },
        orderBy: { seq: "desc" },
      });
      const seq = (last?.seq ?? 0) + 1;
      return tx.ownershipEntry.create({
        data: {
          productId: input.productId,
          seq,
          fromParty: input.fromParty,
          toParty: input.toParty,
          note: input.note ?? null,
        },
      });
    });
  },

  latestEntry(productId) {
    return db.ownershipEntry.findFirst({ where: { productId }, orderBy: { seq: "desc" } });
  },

  listEntries(productId) {
    return db.ownershipEntry.findMany({ where: { productId }, orderBy: { seq: "asc" } });
  },

  createTransferRequest(input) {
    return db.transferRequest.create({
      data: {
        productId: input.productId,
        fromParty: input.fromParty,
        toParty: input.toParty,
        note: input.note ?? null,
      },
    });
  },

  getTransferRequest(id) {
    return db.transferRequest.findUnique({ where: { id } });
  },

  listRequests(productId, status) {
    return db.transferRequest.findMany({
      where: { productId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
  },

  setRequestStatus(id, status) {
    return db.transferRequest.update({
      where: { id },
      data: { status, resolvedAt: status === "PENDING" ? null : new Date() },
    });
  },
});
