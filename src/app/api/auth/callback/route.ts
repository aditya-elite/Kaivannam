import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/register";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      const suUser = data.user;
      const email = suUser.email || suUser.user_metadata?.email || suUser.id;
      const displayName = suUser.user_metadata?.full_name || suUser.user_metadata?.name || email.split("@")[0];
      const photoUrl = suUser.user_metadata?.avatar_url || suUser.user_metadata?.picture || null;

      // Find or create local user record synced with Supabase registration
      let user = await db.user.findFirst({
        where: {
          OR: [{ handle: email }, { id: suUser.id }],
        },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            id: suUser.id,
            handle: email,
            passwordHash: "SUPABASE_OAUTH",
            displayName,
            role: "ARTISAN",
            artisan: {
              create: {
                fullName: displayName,
                craft: "Not specified",
                region: "Not specified",
                state: "Not specified",
                photoUrl,
                tier: "SELF_DECLARED",
              },
            },
          },
        });
      }

      await createSession(user.id);
      
      const redirectUrl = next.startsWith("/") && !next.startsWith("//") ? `${origin}${next}` : `${origin}/register`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Auth error fallback
  return NextResponse.redirect(`${origin}/login?error=auth.error`);
}
