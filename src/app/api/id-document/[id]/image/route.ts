import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrivateDocObject } from "@/lib/id-document";

export const runtime = "nodejs";

/**
 * GET /api/id-document/[id]/image — streams the private ID image to the owning
 * artisan or an admin only (auth enforced in getPrivateDocObject). Same-origin
 * cookie auth applies, so it's safe to open directly in a tab. Never cached by
 * shared caches.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { id } = await params;
  const obj = await getPrivateDocObject(id, "image", user);
  if (!obj) return NextResponse.json({ error: "not_found_or_forbidden" }, { status: 404 });

  return new Response(new Uint8Array(obj.bytes), {
    headers: { "Content-Type": obj.contentType, "Cache-Control": "private, no-store" },
  });
}
