import { db } from "../db";
import { sha256 } from "../hash";

/**
 * Persistent buyer-verification history — a consensus INPUT.
 *
 * Distinct from lib/scan-log (which is an in-memory ring buffer for real-time
 * replay/clone detection and resets on restart). This table accumulates genuine
 * scans over the item's whole life so the score can reflect a real, circulating
 * object. A newly registered item has none and gains it slowly.
 *
 * Only the coarse location label and a salted, one-way hash of the scanner are
 * stored — enough to count distinct scanners and the spread of places, never a
 * track of a person.
 */

const SALT = process.env.SCAN_HASH_SALT ?? "kaivannam-scan-history-v1";

export async function recordVerificationScan(opts: {
  productId: string;
  scanner?: string | null; // IP or device id — hashed, never stored raw
  locationLabel?: string | null; // coarse: a city / region
}): Promise<void> {
  await db.verificationScan.create({
    data: {
      productId: opts.productId,
      locationLabel: opts.locationLabel?.trim() || null,
      scannerHash: opts.scanner ? sha256(`${SALT}|${opts.scanner}`) : null,
    },
  });
}
