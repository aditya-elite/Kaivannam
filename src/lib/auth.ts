import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { newToken } from "./ids";

const COOKIE = "ks_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Create a session + set the httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

export type CurrentUser = {
  id: string;
  handle: string;
  displayName: string;
  role: "ARTISAN" | "COORDINATOR" | "ADMIN";
  artisanId: string | null;
};

/** Resolve the logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { artisan: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    role: u.role,
    artisanId: u.artisan?.id ?? null,
  };
}
