import QRCode from "qrcode";

/**
 * Generate a QR PNG (as a data URL) for the DYNAMIC signed tag. The QR encodes
 * the 3-key scan URL carrying the signed payload:
 *   `${baseUrl}/scan?p=<ProductID>&t=<Timestamp>&s=<Signature>`
 * The scanner verifies the signature (KEY 1) with the artisan's public key, so a
 * photocopied/forged tag cannot pass. High error-correction so a slightly damaged
 * printed tag still scans.
 */
export async function generateProductQrPng(
  productId: string,
  baseUrl: string,
  opts: { timestampIso: string; signatureB64: string },
): Promise<Buffer> {
  const params = new URLSearchParams({
    p: productId,
    t: opts.timestampIso,
    s: opts.signatureB64,
  });
  const url = `${baseUrl}/scan?${params.toString()}`;
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 8,
    color: { dark: "#2B1D14", light: "#FDF8F0" }, // ink on khadi cream
  });
}
