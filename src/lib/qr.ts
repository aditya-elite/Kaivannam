import QRCode from "qrcode";

/**
 * Generate a QR PNG (as a data URL) that points at the public verification page.
 * High error-correction so a slightly damaged printed tag still scans.
 */
export async function generateProductQrPng(productId: string, baseUrl: string): Promise<Buffer> {
  const url = `${baseUrl}/product/${productId}`;
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 8,
    color: { dark: "#2B1D14", light: "#FDF8F0" }, // ink on khadi cream
  });
}
