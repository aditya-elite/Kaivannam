"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  // Only allow internal paths — never an open redirect.
  return s.startsWith("/") && !s.startsWith("//") ? s : "/register";
}

export type AuthState = { error?: string };

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const user = await db.user.findUnique({ where: { handle } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "auth.error" };
  }
  await createSession(user.id);
  redirect(next);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!handle || password.length < 4 || !displayName) {
    return { error: "auth.error" };
  }
  const existing = await db.user.findUnique({ where: { handle } });
  if (existing) return { error: "auth.error" };

  const user = await db.user.create({
    data: {
      handle,
      passwordHash: await hashPassword(password),
      displayName,
      role: "ARTISAN",
      // Every new registrant gets a Self-declared artisan profile immediately —
      // no binary gate; they can add verification later.
      artisan: {
        create: {
          fullName: displayName,
          craft: "Not specified",
          region: "Not specified",
          state: "Not specified",
          tier: "SELF_DECLARED",
        },
      },
    },
  });
  await createSession(user.id);
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
