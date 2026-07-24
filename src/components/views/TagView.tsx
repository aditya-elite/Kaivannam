"use client";

import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui";
import { IconPrint, IconThread } from "@/components/icons";

/**
 * The tag is the only part of Kaivannam that becomes a physical object, and it
 * was printing like a web page that happened to have a QR code on it.
 *
 * What is added here is print *furniture* — the marks a printed artefact needs
 * and a screen does not:
 *   · Cut marks, because tags get cut out with scissors.
 *   · A fold line, so the tag can hang double-sided over a garment edge.
 *   · A signature rule. The artisan signs the physical object, and a signature
 *     is the one credential a counterfeiter cannot copy out of the database.
 *
 * All three are shown on screen too (at low contrast) so the artisan can see
 * what they are about to print, and are forced visible in @media print.
 */
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
      <div className="tag-sheet relative mx-auto w-[320px] border-2 border-ink bg-white p-6 text-center text-ink">
        {/* Corner cut marks. */}
        <span className="cut-mark absolute left-1.5 top-1.5 h-3 w-3 border-l border-t border-ink/50" />
        <span className="cut-mark absolute right-1.5 top-1.5 h-3 w-3 border-r border-t border-ink/50" />
        <span className="cut-mark absolute bottom-1.5 left-1.5 h-3 w-3 border-b border-l border-ink/50" />
        <span className="cut-mark absolute bottom-1.5 right-1.5 h-3 w-3 border-b border-r border-ink/50" />

        <div className="flex items-center justify-center gap-2">
          <IconThread width={20} height={20} />
          <span className="text-lg font-extrabold">
            Kai<span className="text-terracotta">vannam</span>
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

        {/* Tabular + tracked: this is precisely where the ID gets read from,
            often in poor light, and typed into the lookup field. */}
        <p className="product-id font-mono text-base font-bold">{id}</p>
        <p className="mt-2 text-base font-semibold">{title}</p>
        <p className="text-sm text-muted">
          {craft} · {artisanName}
        </p>

        {/* Fold line — the tag hangs doubled over an edge. */}
        <div className="fold-line relative my-4" aria-hidden="true">
          <span className="block border-t border-dashed border-ink/35" />
          <span className="absolute right-0 top-[-1.05rem] text-[9px] uppercase tracking-[0.14em] text-ink/40">
            {t("tag.fold")}
          </span>
        </div>

        {/* Signature rule. */}
        <div className="sig-rule" aria-hidden="true">
          <span className="mx-2 block h-7 border-b border-ink/45" />
          <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-muted">
            {t("tag.signature")}
          </span>
        </div>

        <p className="mt-3 border-t border-ink/15 pt-2 text-xs text-muted">
          {t("lookup.subtitle")}
        </p>
      </div>
    </div>
  );
}
