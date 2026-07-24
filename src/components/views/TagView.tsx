"use client";

import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui";
import { IconPrint, IconThread } from "@/components/icons";

export function TagView({
  id,
  title,
  artisanName,
  craft,
}: {
  id: string;
  title: string;
  artisanName: string;
  craft: string;
}) {
  const t = useT();
  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 print:hidden">
        <Button onClick={() => window.print()} className="w-full">
          <IconPrint width={20} height={20} /> {t("reg.done.print")}
        </Button>
      </div>

      {/* The tag itself — high contrast, scannable, minimal. */}
      <div className="mx-auto w-[320px] rounded-2xl border-2 border-ink bg-white p-5 text-center text-ink">
        <div className="flex items-center justify-center gap-2">
          <IconThread width={20} height={20} />
          <span className="text-lg font-extrabold">
            Kalā<span className="text-terracotta">sūtra</span>
          </span>
        </div>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted">{t("app.tagline")}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/products/${id}/qr`}
          alt={`QR code for ${title}`}
          className="mx-auto my-3 h-52 w-52"
          width={208}
          height={208}
        />

        <p className="font-mono text-base font-bold tracking-wider">{id}</p>
        <p className="mt-2 text-base font-semibold">{title}</p>
        <p className="text-sm text-muted">
          {craft} · {artisanName}
        </p>
        <p className="mt-3 border-t border-ink/15 pt-2 text-xs text-muted">
          {t("lookup.subtitle")}
        </p>
      </div>
    </div>
  );
}
