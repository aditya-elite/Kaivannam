"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { IconThread, IconMenu, IconClose, IconUser } from "./icons";

type Props = { user: { displayName: string; role: string } | null };

export function SiteHeader({ user }: Props) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Public, no-auth links. "Register a product" is visible but the auth gate
  // only triggers when actually starting registration.
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/artisans", label: t("nav.artisans") },
    { href: "/lookup", label: t("nav.lookup") },
    { href: "/how-it-works", label: t("nav.how") },
  ];
  if (user) links.push({ href: "/my-items", label: t("nav.myitems") });
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
          <Link
            href="/register"
            className="hidden min-h-tap items-center gap-2 rounded-xl bg-terracotta px-4 py-2 text-base font-semibold text-white hover:bg-terracotta-600 sm:inline-flex"
          >
            {t("nav.register")}
          </Link>
          {user ? (
            <Link
              href="/my-items"
              className="hidden min-h-tap min-w-tap items-center justify-center rounded-xl border-2 border-ink/15 px-3 text-ink md:inline-flex"
              aria-label={user.displayName}
              title={user.displayName}
            >
              <IconUser width={22} height={22} />
            </Link>
          ) : null}
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
            {[...links, { href: "/register", label: t("nav.register") }].map((l) => (
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
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
