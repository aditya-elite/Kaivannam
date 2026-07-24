import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";

// Serves uploaded craft photos / voice notes from the local object-storage dir.
// In production this route is replaced by the object store's own signed URLs.
const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webm: "audio/webm",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  const bytes = await getStorage().getBytes(joined);
  if (!bytes) return new Response("Not found", { status: 404 });
  const ext = joined.split(".").pop()?.toLowerCase() ?? "bin";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
