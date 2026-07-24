"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { IconThread, IconAlert } from "./icons";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-16 border-t border-ink/10 bg-indigo text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <IconThread width={22} height={22} />
            </span>
            <span className="text-xl font-extrabold">Kalāsūtra</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-base">
            <Link href="/artisans" className="text-white/90 hover:text-white hover:underline">
              {t("nav.artisans")}
            </Link>
            <Link href="/lookup" className="text-white/90 hover:text-white hover:underline">
              {t("nav.lookup")}
            </Link>
            <Link href="/how-it-works" className="text-white/90 hover:text-white hover:underline">
              {t("nav.how")}
            </Link>
          </nav>
        </div>
        <p className="mt-6 max-w-2xl text-base text-white/80">{t("footer.rights")}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
          <IconAlert width={16} height={16} />
          {t("footer.testnet")}
        </p>
      </div>
    </footer>
  );
}
