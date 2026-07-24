import { db } from "./db";
import { getLedger } from "./ledger";
import { computeProductHash, STAGE_ORDER } from "./product-record";
import type { Stage } from "@prisma/client";

export type CheckResult = { ok: boolean; label: string };

export type VerifiedTimelineStage = {
  stage: Stage;
  capturedAt: Date;
  photoUrls: string[];
  note: string | null;
  version: number;
};

export type VerificationResult = {
  found: boolean;
  // Overall verdict for the plain-language banner.
  verdict: "AUTHENTIC" | "AUTHENTIC_UNVERIFIED_MAKER" | "TAMPERED" | "NOT_FOUND";
  checks: {
    exists: boolean;
    qrValid: boolean;
    hashMatches: boolean;
    makerChecked: boolean;
  };
  isTestnet: boolean;
  ledgerSeq?: number;
  contentHashShort?: string;
  product?: {
    id: string;
    title: string;
    materials: string;
    category: string;
    storyText: string | null;
    storyVoiceUrl: string | null;
    sealedAt: Date | null;
  };
  artisan?: {
    id: string;
    fullName: string;
    craft: string;
    region: string;
    state: string;
    tier: string;
    photoUrl: string | null;
    // Public attestation contact — shown so a cooperative/NGO can reach the
    // maker to arrange independent verification.
    contactEmail: string | null;
    contactPhone: string | null;
  };
  timeline?: VerifiedTimelineStage[];
};

/**
 * Runs the four consumer-facing checks for a scanned product:
 *   1. product exists   2. QR/tag valid   3. record matches its secure
 *   fingerprint (recomputed + ledger chain intact)   4. maker identity checked.
 * The hidden signature is part of the hash but is NEVER included in the output.
 */
export async function verifyProduct(productId: string): Promise<VerificationResult> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { artisan: true, stages: true, ledgerEntry: true },
  });

  if (!product) {
    return {
      found: false,
      verdict: "NOT_FOUND",
      checks: { exists: false, qrValid: false, hashMatches: false, makerChecked: false },
      isTestnet: true,
    };
  }

  const exists = true;
  const qrValid = product.status === "SEALED" && !!product.ledgerEntry;

  // Recompute the content hash from the CURRENT record and compare to what the
  // ledger sealed, and confirm the ledger chain link is intact.
  let hashMatches = false;
  let isTestnet = true;
  let ledgerSeq: number | undefined;
  if (product.ledgerEntry && product.contentHash) {
    const recomputed = await computeProductHash({
      id: product.id,
      title: product.title,
      materials: product.materials,
      category: product.category,
      storyText: product.storyText,
      artisan: {
        id: product.artisan.id,
        fullName: product.artisan.fullName,
        craft: product.artisan.craft,
        region: product.artisan.region,
      },
      hiddenSignatureHash: product.artisan.hiddenSignatureHash,
      stages: product.stages.map((s) => ({
        stage: s.stage,
        version: s.version,
        capturedAt: s.capturedAt,
        photoUrls: JSON.parse(s.photoUrls) as string[],
        note: s.note,
      })),
    });
    const ledgerCheck = await getLedger().verify(product.id);
    hashMatches =
      recomputed === product.contentHash &&
      recomputed === product.ledgerEntry.contentHash &&
      ledgerCheck.intact;
    isTestnet = product.ledgerEntry.isTestnet;
    ledgerSeq = product.ledgerEntry.seq;
  }

  const makerChecked = product.artisan.tier !== "SELF_DECLARED";

  let verdict: VerificationResult["verdict"];
  if (!qrValid) verdict = "NOT_FOUND";
  else if (!hashMatches) verdict = "TAMPERED";
  else if (!makerChecked) verdict = "AUTHENTIC_UNVERIFIED_MAKER";
  else verdict = "AUTHENTIC";

  // Build the display timeline: latest version per stage, in canonical order.
  const timeline: VerifiedTimelineStage[] = STAGE_ORDER.map((stageName) => {
    const entries = product.stages
      .filter((s) => s.stage === stageName)
      .sort((a, b) => b.version - a.version);
    const latest = entries[0];
    if (!latest) return null;
    return {
      stage: stageName,
      capturedAt: latest.capturedAt,
      photoUrls: JSON.parse(latest.photoUrls) as string[],
      note: latest.note,
      version: latest.version,
    };
  }).filter((s): s is VerifiedTimelineStage => s !== null);

  return {
    found: true,
    verdict,
    checks: { exists, qrValid, hashMatches, makerChecked },
    isTestnet,
    ledgerSeq,
    contentHashShort: product.contentHash ? product.contentHash.slice(0, 16) : undefined,
    product: {
      id: product.id,
      title: product.title,
      materials: product.materials,
      category: product.category,
      storyText: product.storyText,
      storyVoiceUrl: product.storyVoiceUrl,
      sealedAt: product.sealedAt,
    },
    artisan: {
      id: product.artisan.id,
      fullName: product.artisan.fullName,
      craft: product.artisan.craft,
      region: product.artisan.region,
      state: product.artisan.state,
      tier: product.artisan.tier,
      photoUrl: product.artisan.photoUrl,
      contactEmail: product.artisan.contactEmail,
      contactPhone: product.artisan.contactPhone,
    },
    timeline,
  };
}
