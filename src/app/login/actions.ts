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
  const accountType = String(formData.get("accountType") ?? "artisan");
  const next = safeNext(formData.get("next"));

  if (!handle || password.length < 4 || !displayName) {
    return { error: "auth.error" };
  }
  const existing = await db.user.findUnique({ where: { handle } });
  if (existing) return { error: "auth.error" };

  // A shopper account is a CONSUMER with NO artisan profile — buying is separate
  // from making. Artisans get a Self-declared profile immediately (add docs later).
  const isShopper = accountType === "shopper";
  const user = await db.user.create({
    data: {
      handle,
      passwordHash: await hashPassword(password),
      displayName,
      role: isShopper ? "CONSUMER" : "ARTISAN",
      ...(isShopper
        ? {}
        : {
            artisan: {
              create: {
                fullName: displayName,
                craft: "Not specified",
                region: "Not specified",
                state: "Not specified",
                tier: "SELF_DECLARED",
              },
            },
          }),
    },
  });
  // Link any prior guest orders placed with this handle (if it's an email).
  if (isShopper) await linkGuestOrders(user.id, handle);
  await createSession(user.id);
  redirect(next);
}

/**
 * Create a CONSUMER account from the post-purchase "register later" prompt. The
 * email + name are pre-filled from the order, and any guest orders sharing that
 * email are linked to the new account.
 */
export async function signUpConsumerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "").trim(); // email
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || handle;
  const next = safeNext(formData.get("next"));

  if (!handle || password.length < 4) return { error: "auth.error" };
  const existing = await db.user.findUnique({ where: { handle } });
  if (existing) return { error: "auth.exists" };

  const user = await db.user.create({
    data: { handle, passwordHash: await hashPassword(password), displayName, role: "CONSUMER" },
  });
  await linkGuestOrders(user.id, handle);
  await createSession(user.id);
  redirect(next);
}

/** Attach past guest orders (no buyerUserId) with this email to a new account. */
async function linkGuestOrders(userId: string, email: string): Promise<void> {
  await db.order.updateMany({
    where: { buyerUserId: null, buyerEmail: email },
    data: { buyerUserId: userId },
  });
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
