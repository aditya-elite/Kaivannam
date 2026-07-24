import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyScanSignature } from "@/lib/crypto-keys";
import { checkReplay, recordScan } from "@/lib/scan-log";
import { evaluate3KeyTrust } from "@/lib/three-key";
import { computeProductHash } from "@/lib/product-record";
import { getLedger } from "@/lib/ledger";
import type { GeoPoint } from "@/lib/geo";

/**
 * POST /api/verify-scan — the 3-Key Verification Engine entry point.
 *
 * Body: { ProductID, Signature, Timestamp, GeoLocation, ScannerIP, LivenessPassed }
 *
 * Runs KEY 1 (ECDSA signature), KEY 2 (liveness flag + geo-temporal replay), and
 * KEY 3 (provenance/ledger hash), then returns the combiner's verdict with its
 * HTTP status. The verdict body is the same shape the Jury Panel renders.
 */

type Body = {
  ProductID?: string;
  Signature?: string;
  Timestamp?: string;
  GeoLocation?: GeoPoint | null;
  ScannerIP?: string;
  LivenessPassed?: boolean;
};

function clientIp(req: NextRequest, provided?: string): string {
  if (provided) return provided;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const productId = (body.ProductID ?? "").trim().toUpperCase();
  const signature = body.Signature ?? "";
  const timestamp = body.Timestamp ?? "";
  const geo = body.GeoLocation ?? null;
  const ip = clientIp(req, body.ScannerIP);
  const livenessPassed = body.LivenessPassed === true;

  const product = productId
    ? await db.product.findUnique({
        where: { id: productId },
        include: { artisan: true, stages: true, ledgerEntry: true },
      })
    : null;

  // ── KEY 1: cryptographic signature ──────────────────────────────────────────
  // No product / no key / no signature all read as an invalid (counterfeit) tag.
  const key1Valid =
    !!product &&
    !!product.artisan.signingPublicKey &&
    verifyScanSignature(productId, timestamp, signature, product.artisan.signingPublicKey);

  // ── KEY 2: liveness + geo-temporal replay ───────────────────────────────────
  const replay = checkReplay(productId, ip, geo, Date.now());
  // Record this scan AFTER checking (so the current scan doesn't trip its own check).
  if (productId) recordScan({ productId, ip, geo, at: Date.now() });

  // ── KEY 3: provenance / ledger hash ─────────────────────────────────────────
  let hashMatches = false;
  if (product && product.ledgerEntry && product.contentHash) {
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
  }

  const verdict = evaluate3KeyTrust(
    { valid: key1Valid },
    { livenessPassed, replay },
    { hashMatches },
  );

  return NextResponse.json(
    {
      verdict: verdict.verdictCode,
      message: verdict.message,
      keys: verdict.keys,
      product: product
        ? {
            id: product.id,
            title: product.title,
            artisanName: product.artisan.fullName,
            artisanId: product.artisan.id,
          }
        : null,
    },
    { status: verdict.status },
  );
}
