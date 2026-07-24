import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { signIdDocView } from "@/lib/id-document";

export const runtime = "nodejs";

/**
 * GET /api/id-document/[id]/view — mint short-lived signed URLs for the private
 * image + certificate. Gated to the owning artisan or an admin (enforced in
 * signIdDocView). URLs expire in ~60s, so they're safe to hand to the browser.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { id } = await params;
  const urls = await signIdDocView(id, user);
  if (!urls) return NextResponse.json({ error: "not_found_or_forbidden" }, { status: 404 });
  return NextResponse.json(urls);
}
