import { fileContentHash, productContentHash, sha256, type ProductRecordForHash } from "./hash";
import { getStorage } from "./storage";
import type { Stage } from "@prisma/client";

// The canonical order of stages in the timeline.
export const STAGE_ORDER: Stage[] = ["RAW_MATERIALS", "CRAFTING", "FINISHING", "COMPLETED"];

export type StageForRecord = {
  stage: string;
  version: number;
  capturedAt: Date;
  photoUrls: string[];
  note: string | null;
};

export type ProductForRecord = {
  id: string;
  title: string;
  materials: string;
  category: string;
  storyText: string | null;
  artisan: { id: string; fullName: string; craft: string; region: string };
  hiddenSignatureHash: string | null;
  stages: StageForRecord[];
};

/**
 * Resolve each photo URL to its STABLE content hash (the file's bytes), so the
 * record hash survives a storage migration where URLs change but bytes do not.
 * For seeded sample images that live in /public (no bytes in object storage),
 * we fall back to hashing the URL string as a stable identifier — sufficient
 * for the demo and still deterministic.
 */
async function photoContentHashes(urls: string[]): Promise<string[]> {
  const storage = getStorage();
  const hashes = await Promise.all(
    urls.map(async (url) => {
      const m = /^\/api\/files\/(.+)$/.exec(url);
      if (m) {
        const bytes = await storage.getBytes(m[1]);
        if (bytes) return fileContentHash(bytes);
      }
      return sha256(url); // stable fallback for sample/static assets
    }),
  );
  return hashes.sort();
}

export async function buildRecord(p: ProductForRecord): Promise<ProductRecordForHash> {
  const stages = await Promise.all(
    // Only the latest version per stage contributes to the sealed record.
    STAGE_ORDER.map(async (stageName) => {
      const entries = p.stages
        .filter((s) => s.stage === stageName)
        .sort((a, b) => b.version - a.version);
      const latest = entries[0];
      if (!latest) return null;
      return {
        stage: stageName,
        version: latest.version,
        capturedAt: latest.capturedAt.toISOString(),
        photoContentHashes: await photoContentHashes(latest.photoUrls),
        note: latest.note,
      };
    }),
  );

  return {
    productId: p.id,
    title: p.title,
    materials: p.materials,
    category: p.category,
    storyText: p.storyText,
    artisan: p.artisan,
    hiddenSignatureHash: p.hiddenSignatureHash,
    stages: stages.filter((s): s is NonNullable<typeof s> => s !== null),
  };
}

export async function computeProductHash(p: ProductForRecord): Promise<string> {
  return productContentHash(await buildRecord(p));
}
