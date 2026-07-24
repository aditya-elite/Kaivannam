"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  // Only allow internal paths — never an open redirect.
  return s.startsWith("/") && !s.startsWith("//") ? s : "/register";
}

function toEmail(handle: string): string {
  return handle.includes("@") ? handle : `${handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@kaivannam.app`;
}

export type AuthState = { error?: string };

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!handle || !password) {
    return { error: "auth.error" };
  }

  // 1. Authenticate with Supabase Auth
  const supabase = await createClient();
  const email = toEmail(handle);
  
  const { data: suData, error: suError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 2. Check local database record
  let user = await db.user.findUnique({ where: { handle } });

  if (!user && suData?.user) {
    // If registered in Supabase but missing local record, create it
    const displayName = suData.user.user_metadata?.displayName || handle;
    user = await db.user.create({
      data: {
        id: suData.user.id,
        handle,
        passwordHash: await hashPassword(password),
        displayName,
        role: "ARTISAN",
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
  }

  if (!user) {
    return { error: "auth.error" };
  }

  // If local user exists and password matches (or Supabase succeeded)
  if (suError && !(await verifyPassword(password, user.passwordHash))) {
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

  // 1. Store registration in Supabase Auth
  const supabase = await createClient();
  const email = toEmail(handle);

  const { data: suData, error: suError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        handle,
        displayName,
        accountType,
      },
    },
  });

  if (suError && suError.message && !suError.message.includes("User already registered")) {
    console.warn("Supabase registration note:", suError.message);
  }

  // 2. Create local database user & artisan profile
  const isShopper = accountType === "shopper";
  const user = await db.user.create({
    data: {
      ...(suData?.user?.id ? { id: suData.user.id } : {}),
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

  // Link any prior guest orders placed with this handle (if it's an email)
  if (isShopper) await linkGuestOrders(user.id, handle);
  await createSession(user.id);
  redirect(next);
}

export async function signUpConsumerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "").trim(); // email
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || handle;
  const next = safeNext(formData.get("next"));

  if (!handle || password.length < 4) return { error: "auth.error" };
  const existing = await db.user.findUnique({ where: { handle } });
  if (existing) return { error: "auth.exists" };

  // Store in Supabase Auth
  const supabase = await createClient();
  await supabase.auth.signUp({
    email: toEmail(handle),
    password,
    options: { data: { handle, displayName, accountType: "shopper" } },
  });

  const user = await db.user.create({
    data: { handle, passwordHash: await hashPassword(password), displayName, role: "CONSUMER" },
  });
  await linkGuestOrders(user.id, handle);
  await createSession(user.id);
  redirect(next);
}

async function linkGuestOrders(userId: string, email: string): Promise<void> {
  await db.order.updateMany({
    where: { buyerUserId: null, buyerEmail: email },
    data: { buyerUserId: userId },
  });
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await destroySession();
  redirect("/");
}
