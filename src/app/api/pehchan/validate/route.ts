import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validatePehchan } from "@/lib/pehchan";

/**
 * POST /api/pehchan/validate — Gate-1 live validity for a typed/OCR'd Pehchan
 * number. Returns format + register-membership status so the identity form can
 * give immediate feedback before submit. Auth-gated (only registered users).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { number } = (await req.json().catch(() => ({}))) as { number?: string };
  const v = await validatePehchan(number ?? "");
  return NextResponse.json({
    formatOk: v.formatOk,
    inRegister: v.inRegister,
    valid: v.valid,
    holderName: v.holderName,
    datasetVersion: v.datasetVersion,
    lastSyncedAt: v.lastSyncedAt,
  });
}
