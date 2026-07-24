import { db } from "./db";
import { maskPehchan } from "./pehchan-format";
import { signedUrl } from "./supabase/storage";
import type { CurrentUser } from "./auth";

/**
 * Read-model for the artisan ID document (the signing/anchoring pipeline record).
 * The heavy artefacts (image, certificate) stay in the private bucket; here we
 * only surface metadata + status, and mint signed view URLs on demand behind an
 * owner/admin check.
 */

export type IdDocStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export type IdDocView = {
  requestId: string | null;
  status: IdDocStatus;
  idNumberMasked: string | null;
  anchorSeq: number | null;
  imageHashShort: string | null;
  signaturePresent: boolean;
  signingKeyId: string | null;
  hasCertificate: boolean;
  error: string | null;
  processedAt: string | null;
};

const EMPTY: IdDocView = {
  requestId: null,
  status: "NONE",
  idNumberMasked: null,
  anchorSeq: null,
  imageHashShort: null,
  signaturePresent: false,
  signingKeyId: null,
  hasCertificate: false,
  error: null,
  processedAt: null,
};

/** The latest ID-document record for an artisan, as safe metadata. */
export async function getArtisanIdDocument(artisanId: string): Promise<IdDocView> {
  const r = await db.verificationRequest.findFirst({
    where: { artisanId, imageSha256: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!r) return EMPTY;
  return {
    requestId: r.id,
    status: r.idDocStatus,
    idNumberMasked: r.ocrIdNumber ? maskPehchan(r.ocrIdNumber) : null,
    anchorSeq: r.anchorSeq,
    imageHashShort: r.imageSha256 ? r.imageSha256.slice(0, 16) : null,
    signaturePresent: !!r.serverSignature,
    signingKeyId: r.signingKeyId,
    hasCertificate: !!r.certPath,
    error: r.idDocError,
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
  };
}

/**
 * Short-lived signed URLs for the image + certificate — ONLY for the owning
 * artisan or an admin. Returns null when unauthorized or not found. The private
 * objects are never otherwise reachable.
 */
export async function signIdDocView(
  requestId: string,
  user: CurrentUser,
): Promise<{ imageUrl: string | null; certUrl: string | null } | null> {
  const r = await db.verificationRequest.findUnique({
    where: { id: requestId },
    select: { artisanId: true, imagePath: true, certPath: true },
  });
  if (!r) return null;

  const isOwner = user.artisanId != null && user.artisanId === r.artisanId;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return null;

  return {
    imageUrl: r.imagePath ? await signedUrl(r.imagePath, 60) : null,
    certUrl: r.certPath ? await signedUrl(r.certPath, 60) : null,
  };
}
