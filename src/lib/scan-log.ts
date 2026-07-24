import { haversineKm, type GeoPoint } from "./geo";

/**
 * KEY 2 (part b) — Geo-Temporal Replay engine.
 *
 * The master prompt specifies an IN-MEMORY scan history log. This module holds a
 * process-local ring buffer of recent scans; it intentionally resets on server
 * restart (no persistence). A genuine tag is scanned in one place at a time; the
 * same ProductID appearing again within an hour from a DIFFERENT network or a
 * location > 50 km away is the signature of a cloned/replayed QR.
 */

export type ScanEvent = {
  productId: string;
  ip: string;
  geo: GeoPoint | null;
  at: number; // epoch ms
};

export type ReplayStatus = "OK" | "REPLAY_CLONED";

const ONE_HOUR_MS = 60 * 60 * 1000;
const GEO_THRESHOLD_KM = 50;
const MAX_EVENTS = 5000; // cap so the buffer can't grow unbounded

// Module-level in-memory history (per the spec).
const scanHistory: ScanEvent[] = [];

/** Drop events older than one hour to keep the window and the buffer bounded. */
function prune(now: number): void {
  const cutoff = now - ONE_HOUR_MS;
  // Remove from the front while stale (history is roughly time-ordered).
  while (scanHistory.length && scanHistory[0].at < cutoff) scanHistory.shift();
  if (scanHistory.length > MAX_EVENTS) scanHistory.splice(0, scanHistory.length - MAX_EVENTS);
}

/** Append the current scan to the in-memory log. */
export function recordScan(event: ScanEvent): void {
  prune(event.at);
  scanHistory.push(event);
}

/**
 * Decide whether the incoming scan looks like a replayed/cloned QR, BEFORE it is
 * recorded. Rule (from the spec): within the last hour, if the same ProductID has
 * been seen more than once AND the new scan is from a different IP OR more than
 * 50 km away from a prior scan → REPLAY_CLONED.
 */
export function checkReplay(
  productId: string,
  ip: string,
  geo: GeoPoint | null,
  now: number = Date.now(),
): ReplayStatus {
  prune(now);
  const priors = scanHistory.filter(
    (e) => e.productId === productId && now - e.at <= ONE_HOUR_MS,
  );
  if (priors.length === 0) return "OK"; // first scan this hour — count would be 1

  // scan_count including this one is > 1; now check IP / geo divergence.
  const suspicious = priors.some((e) => {
    const differentIp = !!ip && !!e.ip && e.ip !== ip;
    const farApart = geo && e.geo ? haversineKm(geo, e.geo) > GEO_THRESHOLD_KM : false;
    return differentIp || farApart;
  });
  return suspicious ? "REPLAY_CLONED" : "OK";
}

/** Test/seed helper — clears the in-memory history. */
export function _resetScanLog(): void {
  scanHistory.length = 0;
}
