import type { ReplayStatus } from "./scan-log";

/**
 * The Zero-Knowledge Verification Engine — the combiner.
 *
 * Takes the three independent key results and returns a single verdict with the
 * HTTP status and message specified by the master prompt. Precedence matters:
 * signature first (is the tag even genuine?), then liveness (is a live object in
 * front of the camera?), then replay (is this a cloned tag seen elsewhere?), then
 * the provenance hash (does the record still match what was sealed?).
 */

export type Key1Result = { valid: boolean }; // ECDSA signature check
export type Key2Result = { livenessPassed: boolean; replay: ReplayStatus };
export type Key3Result = { hashMatches: boolean }; // provenance/ledger hash check

export type TrustVerdict = {
  status: 200 | 401 | 403 | 409 | 422;
  verdictCode:
    | "AUTHENTIC"
    | "INVALID_SIGNATURE"
    | "SPOOF_FLAT_IMAGE"
    | "REPLAY_CLONED"
    | "DATA_TAMPERED";
  message: string;
  keys: {
    key1: { label: string; ok: boolean };
    key2: { label: string; ok: boolean };
    key3: { label: string; ok: boolean };
  };
};

export function evaluate3KeyTrust(
  key1: Key1Result,
  key2: Key2Result,
  key3: Key3Result,
): TrustVerdict {
  const keys = {
    key1: { label: "Cryptographic signature", ok: key1.valid },
    key2: {
      label: "Liveness & replay",
      ok: key2.livenessPassed && key2.replay === "OK",
    },
    key3: { label: "Provenance record", ok: key3.hashMatches },
  };

  // KEY 1 — invalid signature ⇒ counterfeit tag.
  if (!key1.valid) {
    return {
      status: 401,
      verdictCode: "INVALID_SIGNATURE",
      message: "Invalid Signature / Counterfeit",
      keys,
    };
  }

  // KEY 2 (liveness) — flat photo of a QR, no 3D motion during scan.
  if (!key2.livenessPassed) {
    return {
      status: 422,
      verdictCode: "SPOOF_FLAT_IMAGE",
      message: "Spoof Detected: Flat Image",
      keys,
    };
  }

  // KEY 2 (replay) — same tag scanned from an implausibly different place/network.
  if (key2.replay === "REPLAY_CLONED") {
    return {
      status: 409,
      verdictCode: "REPLAY_CLONED",
      message: "Warning: QR Code Cloning Detected",
      keys,
    };
  }

  // KEY 3 — the record no longer matches its sealed fingerprint.
  if (!key3.hashMatches) {
    return {
      status: 403,
      verdictCode: "DATA_TAMPERED",
      message: "Data Tampered: Ledger Hash Mismatch",
      keys,
    };
  }

  return {
    status: 200,
    verdictCode: "AUTHENTIC",
    message: "100% Authentic Handcrafted Item",
    keys,
  };
}
