import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { fileContentHash } from "./hash";

/**
 * Object storage abstraction. The database only ever holds the returned URL +
 * contentHash — never the bytes. Swap LocalDiskStorage for an S3/GCS driver in
 * production without changing callers.
 */
export interface StorageService {
  /** Persist bytes, return a stable URL + the file's content hash (stable id). */
  put(bytes: Buffer, opts: { ext: string; prefix?: string }): Promise<StoredObject>;
  getBytes(key: string): Promise<Buffer | null>;
}

export type StoredObject = {
  url: string; // how the app serves/links the file
  key: string; // storage key (opaque)
  contentHash: string; // sha256 of bytes — used in the provenance hash
  size: number;
};

const ROOT = path.join(process.cwd(), "storage-uploads");

class LocalDiskStorage implements StorageService {
  async put(bytes: Buffer, opts: { ext: string; prefix?: string }): Promise<StoredObject> {
    const contentHash = fileContentHash(bytes);
    const prefix = opts.prefix ? `${opts.prefix}/` : "";
    const key = `${prefix}${contentHash}.${opts.ext.replace(/^\./, "")}`;
    const full = path.join(ROOT, key);
    await mkdir(path.dirname(full), { recursive: true });
    if (!existsSync(full)) await writeFile(full, bytes);
    return {
      // Served by src/app/api/files/[...key]/route.ts
      url: `/api/files/${key}`,
      key,
      contentHash,
      size: bytes.length,
    };
  }

  async getBytes(key: string): Promise<Buffer | null> {
    const full = path.join(ROOT, key);
    if (!existsSync(full)) return null;
    return readFile(full);
  }
}

let instance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!instance) instance = new LocalDiskStorage();
  return instance;
}

/** Decode a `data:` URL (used by client uploads) into bytes + extension. */
export function decodeDataUrl(dataUrl: string): { bytes: Buffer; ext: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const bytes = Buffer.from(m[2], "base64");
  const ext =
    mime === "image/webp"
      ? "webp"
      : mime === "image/jpeg"
        ? "jpg"
        : mime === "image/png"
          ? "png"
          : mime.startsWith("audio/")
            ? "webm"
            : "bin";
  return { bytes, ext };
}
