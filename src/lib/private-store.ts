import { getStorage } from "./storage";
import * as sb from "./supabase/storage";

/**
 * Backend-agnostic PRIVATE object store for ID documents.
 *
 * Uses the private Supabase bucket when configured; otherwise falls back to the
 * local disk store under a reserved prefix that the public `/api/files` route
 * refuses to serve (see LOCAL_PRIVATE_PREFIX + the guard there). Either way the
 * bytes are reachable ONLY through the auth-gated streaming routes
 * (`/api/id-document/[id]/image` and `/certificate`), never publicly.
 *
 * The DB stores which backend was used (`imageBucket`) so reads route correctly.
 */

/** Local key prefix that the public files route treats as 404. */
export const LOCAL_PRIVATE_PREFIX = "__private/id-documents";
export const LOCAL_BUCKET = "local";

export function activeBackend(): "supabase" | "local" {
  return sb.isStorageConfigured() ? "supabase" : "local";
}

function extForContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("json")) return "json";
  return "bin";
}

export function contentTypeForPath(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "json") return "application/json";
  return "application/octet-stream";
}

/**
 * Store bytes privately. `desiredPath` is honoured on Supabase (deterministic
 * layout); the local store is content-addressed and returns its own key. Returns
 * the bucket + path to persist on the record.
 */
export async function putPrivate(
  bytes: Buffer,
  contentType: string,
  desiredPath: string,
): Promise<{ bucket: string; path: string }> {
  if (activeBackend() === "supabase") {
    await sb.ensurePrivateBucket();
    await sb.uploadPrivate(desiredPath, bytes, contentType);
    return { bucket: sb.PRIVATE_BUCKET, path: desiredPath };
  }
  const stored = await getStorage().put(bytes, {
    ext: extForContentType(contentType),
    prefix: LOCAL_PRIVATE_PREFIX,
  });
  return { bucket: LOCAL_BUCKET, path: stored.key };
}

/** Read privately-stored bytes back, routing by the stored bucket. */
export async function getPrivate(
  bucket: string | null,
  path: string | null,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!path) return null;
  const contentType = contentTypeForPath(path);
  if (bucket === LOCAL_BUCKET) {
    const bytes = await getStorage().getBytes(path);
    return bytes ? { bytes, contentType } : null;
  }
  const bytes = await sb.downloadPrivate(path);
  return bytes ? { bytes, contentType } : null;
}
