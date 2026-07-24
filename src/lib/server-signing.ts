import {
  createSign,
  createVerify,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} from "crypto";
import { canonicalize, sha256 } from "./hash";

/**
 * THE BACKEND'S OWN SIGNING KEY.
 *
 * This is Kaivannam the platform attesting "we processed and reviewed this
 * document, and it has not been altered since." It is NOT a third-party legal
 * e-signature, and NOT a claim that the government ID is genuine — no public
 * Pehchan verification API exists. UI copy must say "document reviewed" /
 * "Kaivannam verified", never "government-verified".
 *
 * ECDSA P-256, same primitive as the per-artisan keys in crypto-keys.ts, but
 * this is ONE server-wide keypair. The private key is read from the environment
 * (`KAIVANNAM_SIGNING_KEY`, a PKCS8 PEM, optionally base64-encoded so it fits on
 * one .env line) — never hardcoded, never committed. See the README.
 *
 * If the env key is absent, an EPHEMERAL key is generated for this process so
 * the pipeline still runs in local dev; a loud warning is logged and the key
 * fingerprint changes on every restart, which is exactly what you do NOT want in
 * production. Set `KAIVANNAM_SIGNING_KEY` there.
 */

export type ServerSigningKey = {
  privateKeyPem: string;
  publicKeyPem: string;
  /** Short fingerprint of the public key — recorded on each signature so keys
      can be rotated and old signatures still attributed. */
  keyId: string;
  ephemeral: boolean;
};

let cached: ServerSigningKey | null = null;
let warned = false;

function decodeEnvKey(raw: string): string {
  const trimmed = raw.trim();
  // Accept a raw PEM, or a base64-encoded PEM (single-line .env friendly).
  if (trimmed.includes("BEGIN") && trimmed.includes("PRIVATE KEY")) return trimmed;
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("BEGIN") && decoded.includes("PRIVATE KEY")) return decoded;
  } catch {
    /* fall through */
  }
  throw new Error("KAIVANNAM_SIGNING_KEY is set but is not a valid PKCS8 PEM (raw or base64).");
}

export function getServerSigningKey(): ServerSigningKey {
  if (cached) return cached;

  const envKey = process.env.KAIVANNAM_SIGNING_KEY;
  if (envKey) {
    const privateKeyPem = decodeEnvKey(envKey);
    const priv = createPrivateKey(privateKeyPem);
    const publicKeyPem = createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
    cached = { privateKeyPem, publicKeyPem, keyId: sha256(publicKeyPem).slice(0, 16), ephemeral: false };
    return cached;
  }

  // Dev fallback — ephemeral, per-process.
  if (!warned) {
    console.warn(
      "[server-signing] KAIVANNAM_SIGNING_KEY is not set — using an EPHEMERAL key. " +
        "Signatures will not survive a restart. Set it in the environment for production (see README).",
    );
    warned = true;
  }
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  cached = {
    privateKeyPem: privateKey as string,
    publicKeyPem: publicKey as string,
    keyId: sha256(publicKey as string).slice(0, 16),
    ephemeral: true,
  };
  return cached;
}

/** The public key, for a verifier (e.g. an admin screen) to check a signature. */
export function getServerPublicKeyPem(): string {
  return getServerSigningKey().publicKeyPem;
}

export type DocumentPayload = {
  /** The OCR-extracted fields (never raw PII beyond what the artisan uploaded). */
  extracted_data: Record<string, unknown>;
  /** SHA-256 of the uploaded image bytes — the same hash anchored on the ledger. */
  image_hash: string;
  /** ISO-8601 server timestamp of processing. */
  timestamp: string;
};

export type SignedDocument = {
  /** Canonical JSON string that was actually signed (store this verbatim). */
  signedPayload: string;
  /** base64 ECDSA signature over `signedPayload`. */
  signature: string;
  signingKeyId: string;
};

/** Sign a document payload with the server key. Canonical JSON → ECDSA/SHA-256. */
export function signDocumentPayload(payload: DocumentPayload): SignedDocument {
  const key = getServerSigningKey();
  const signedPayload = canonicalize(payload);
  const signer = createSign("SHA256");
  signer.update(signedPayload);
  signer.end();
  const signature = signer.sign(createPrivateKey(key.privateKeyPem)).toString("base64");
  return { signedPayload, signature, signingKeyId: key.keyId };
}

/** Verify a signature over a canonical payload. Never throws — returns false. */
export function verifyDocumentSignature(
  signedPayload: string,
  signatureB64: string,
  publicKeyPem: string = getServerPublicKeyPem(),
): boolean {
  try {
    if (!signedPayload || !signatureB64) return false;
    const verifier = createVerify("SHA256");
    verifier.update(signedPayload);
    verifier.end();
    return verifier.verify(createPublicKey(publicKeyPem), Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
