"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { signOutAction } from "@/app/login/actions";
import { cartCount, onCartChanged } from "@/lib/client/cart";
import { IconThread, IconMenu, IconClose, IconUser, IconBag, IconLogout } from "./icons";

type Props = { user: { displayName: string; role: string } | null };

/** Cart icon + live item-count badge, hydrated from localStorage. */
function CartLink({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(cartCount());
    update();
    return onCartChanged(update);
  }, []);
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative inline-flex min-h-tap min-w-tap items-center justify-center rounded-xl border-2 border-ink/15 px-3 text-ink hover:border-ink/40"
    >
      <IconBag width={22} height={22} />
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-xs font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function SiteHeader({ user }: Props) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Public, no-auth links. "Register a product" is visible but the auth gate
  // only triggers when actually starting registration.
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/shop", label: t("nav.shop") },
    { href: "/artisans", label: t("nav.artisans") },
    { href: "/lookup", label: t("nav.lookup") },
    { href: "/how-it-works", label: t("nav.how") },
  ];
  if (user && user.role !== "CONSUMER") links.push({ href: "/my-items", label: t("nav.myitems") });
  if (user?.role === "ADMIN") links.push({ href: "/admin", label: t("nav.admin") });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /* §4.2 — one thread that travels between tabs rather than a bar that jumps.
     Position and width are measured with getBoundingClientRect and re-measured
     on resize only; nothing runs on scroll. The indicator is decorative —
     aria-current on the link is what actually communicates the active tab, so
     if this never moved the nav would still be correct. */
  const navRef = useRef<HTMLElement>(null);
  const threadRef = useRef<HTMLSpanElement>(null);

  const placeThread = useCallback(() => {
    const nav = navRef.current;
    const thread = threadRef.current;
    if (!nav || !thread) return;
    const active = nav.querySelector<HTMLElement>("[aria-current='page']");
    if (!active) {
      thread.style.opacity = "0";
      return;
    }
    const navBox = nav.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    thread.style.opacity = "1";
    thread.style.transform = `translateX(${box.left - navBox.left}px) scaleX(${box.width})`;
  }, []);

  useEffect(() => {
    placeThread();
    window.addEventListener("resize", placeThread);
    return () => window.removeEventListener("resize", placeThread);
  }, [placeThread, pathname, user]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-ink" aria-label="Kaivannam home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo text-white">
            <IconThread width={22} height={22} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Kai<span className="text-terracotta">vannam</span>
          </span>
        </Link>

        <nav ref={navRef} aria-label="Primary" className="relative hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`min-h-tap rounded-lg px-3 py-2 text-base font-semibold ${
                isActive(l.href) ? "text-indigo" : "text-ink hover:bg-ink/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {/* Uneven sawtooth edge, not a plain rect (clip in motion.css). */}
          <span ref={threadRef} aria-hidden="true" className="thread-underline text-terracotta" />
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <CartLink label={t("nav.cart")} />
          {user ? (
            <>
              <Link
                href={user.role === "CONSUMER" ? "/shop" : "/my-items"}
                className="hidden min-h-tap min-w-tap items-center justify-center rounded-xl border-2 border-ink/15 px-3 text-ink md:inline-flex"
                aria-label={user.displayName}
                title={user.displayName}
              >
                <IconUser width={22} height={22} />
              </Link>
              {/* Sign out — always available (labelled) when signed in. */}
              <form action={signOutAction} className="hidden md:block">
                <button
                  type="submit"
                  className="inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-ink/15 px-3 py-2 text-base font-semibold text-ink hover:border-ink/40"
                >
                  <IconLogout width={18} height={18} /> {t("nav.signout")}
                </button>
              </form>
            </>
          ) : (
            /* Sign in — clearly labelled and present at all times when logged out. */
            <Link
              href="/login"
              className="inline-flex min-h-tap items-center gap-2 rounded-xl bg-indigo px-4 py-2 text-base font-semibold text-white hover:bg-indigo-700"
            >
              <IconUser width={18} height={18} /> {t("nav.signin")}
            </Link>
          )}
          <button
            type="button"
            className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-xl border-2 border-ink/15 md:hidden"
            aria-label={open ? t("common.close") : t("nav.menu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {open ? (
        /* §4.1 — selvedge panel. The decorative woven edge leads and the panel
           body settles in behind it. No backdrop blur: expensive and unreliable
           on low-end GPUs, and it buys nothing here. */
        <nav aria-label="Primary mobile" className="border-t border-ink/10 bg-cream md:hidden">
          <span
            aria-hidden="true"
            className="selvedge-lead block h-1.5 w-full bg-terracotta"
          />
          <ul className="selvedge-follow mx-auto max-w-6xl px-2 py-2">
            {[
              ...links,
              ...(user && user.role !== "CONSUMER" ? [{ href: "/register", label: t("nav.register") }] : []),
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`block min-h-tap rounded-lg px-4 py-3 text-lg font-semibold ${
                    isActive(l.href) ? "bg-indigo/10 text-indigo" : "text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-ink/10">
              {user ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full min-h-tap items-center gap-2 rounded-lg px-4 py-3 text-lg font-semibold text-ink"
                  >
                    <IconLogout width={20} height={20} /> {t("nav.signout")} · {user.displayName}
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-tap items-center gap-2 rounded-lg px-4 py-3 text-lg font-semibold text-indigo"
                >
                  <IconUser width={20} height={20} /> {t("nav.signin")}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
