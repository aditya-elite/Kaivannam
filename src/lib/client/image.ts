"use client";

// Aggressive client-side compression BEFORE upload: resize to max 1600px and
// encode WebP, targeting <200KB per photo. Saves data on rural connections.
const MAX_DIM = 1600;
const TARGET_BYTES = 200 * 1024;

export async function compressImage(file: File | Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // Step quality down until under the size target (or quality floor reached).
  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/webp", quality);
  while (approxBytes(dataUrl) > TARGET_BYTES && quality > 0.4) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }
  return dataUrl;
}

function approxBytes(dataUrl: string): number {
  const b64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((b64.length * 3) / 4);
}
