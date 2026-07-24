import {
  generateKeyPairSync,
  createSign,
  createVerify,
  createPrivateKey,
  createPublicKey,
} from "crypto";

/**
 * KEY 1 — dynamic cryptographic signature utilities.
 *
 * Each artisan holds an ECDSA (P-256) keypair. A product's QR embeds a signature
 * over `${ProductID}|${Timestamp}` made with the artisan PRIVATE key; any scanner
 * verifies it with the artisan PUBLIC key. A forged/altered tag cannot produce a
 * signature that verifies, so KEY 1 failing means "counterfeit".
 *
 * The prompt calls for the Web Crypto API (SubtleCrypto) / Node `crypto`. We use
 * Node's `crypto` on the server (synchronous, no async ceremony). Keys are stored
 * as PEM so they survive a DB round-trip unchanged.
 *
 * SECURITY NOTE: the private key is server-held for this demo. In production it
 * belongs in an HSM / secure enclave and must never be persisted in the clear.
 */

export type ArtisanKeyPair = { publicKeyPem: string; privateKeyPem: string };

/** Generate a fresh ECDSA P-256 keypair as SPKI/PKCS8 PEM strings. */
export function generateArtisanKeyPair(): ArtisanKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKeyPem: publicKey as string, privateKeyPem: privateKey as string };
}

/** The canonical bytes that get signed/verified: ProductID + Timestamp. */
function scanMessage(productId: string, timestampIso: string): string {
  return `${productId}|${timestampIso}`;
}

/** Sign `${productId}|${timestamp}` with the artisan private key → base64 signature. */
export function signScanPayload(
  productId: string,
  timestampIso: string,
  privateKeyPem: string,
): string {
  const signer = createSign("SHA256");
  signer.update(scanMessage(productId, timestampIso));
  signer.end();
  const key = createPrivateKey(privateKeyPem);
  return signer.sign(key).toString("base64");
}

/**
 * Verify a scan signature. Returns false (never throws) on any malformed input,
 * so a garbage/tampered QR cleanly reads as an invalid signature.
 */
export function verifyScanSignature(
  productId: string,
  timestampIso: string,
  signatureB64: string,
  publicKeyPem: string,
): boolean {
  try {
    if (!signatureB64 || !publicKeyPem) return false;
    const verifier = createVerify("SHA256");
    verifier.update(scanMessage(productId, timestampIso));
    verifier.end();
    const key = createPublicKey(publicKeyPem);
    return verifier.verify(key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
