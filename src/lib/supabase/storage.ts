import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * PRIVATE document storage on Supabase Storage.
 *
 * The raw ID image, the extracted fields and the signed certificate live here,
 * in a PRIVATE bucket — never the public craft-media bucket, never on-chain.
 * Access is server-mediated: we mint short-lived signed URLs only after our own
 * auth checks pass (owner or admin), so the objects are never publicly readable.
 *
 * This uses the SERVICE-ROLE key (server-only, bypasses RLS). It must be set in
 * the environment and never exposed to the browser or committed — see the
 * README. Without it, the functions throw `SupabaseNotConfiguredError` so the
 * caller can return a clear "storage not configured" error instead of leaking a
 * half-written record.
 */

export const PRIVATE_BUCKET = "id-documents";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase private storage is not configured. Set SUPABASE_URL (or " +
        "NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. See the README.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

let admin: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return !!(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** The service-role client (cached). Throws if not configured. */
function serviceClient(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseNotConfiguredError();
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Create the private bucket if it does not exist (idempotent). */
export async function ensurePrivateBucket(): Promise<void> {
  const sb = serviceClient();
  const { data } = await sb.storage.getBucket(PRIVATE_BUCKET);
  if (data) return;
  const { error } = await sb.storage.createBucket(PRIVATE_BUCKET, {
    public: false,
    // Images + the small JSON certificate.
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/json"],
    fileSizeLimit: "10MB",
  });
  // Ignore "already exists" races.
  if (error && !/exist/i.test(error.message)) throw error;
}

/** Upload bytes to a path in the private bucket (upsert). Returns the path. */
export async function uploadPrivate(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const sb = serviceClient();
  const { error } = await sb.storage
    .from(PRIVATE_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/**
 * A short-lived signed URL for one object. Call ONLY after an app-level auth
 * check (owner or admin). Default 60s — long enough to load a thumbnail, short
 * enough that a leaked URL is near-useless.
 */
export async function signedUrl(path: string, expiresInSec = 60): Promise<string | null> {
  const sb = serviceClient();
  const { data, error } = await sb.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Download an object's bytes (server-side, e.g. to re-verify a hash). */
export async function downloadPrivate(path: string): Promise<Buffer | null> {
  const sb = serviceClient();
  const { data, error } = await sb.storage.from(PRIVATE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Object paths for a given verification request, kept together per artisan. */
export function docPaths(artisanId: string, requestId: string, imageExt: string) {
  const dir = `artisans/${artisanId}/${requestId}`;
  return {
    dir,
    image: `${dir}/id-image.${imageExt.replace(/^\./, "")}`,
    certificate: `${dir}/certificate.json`,
  };
}
