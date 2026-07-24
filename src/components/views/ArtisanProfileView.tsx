"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Card } from "@/components/ui";
import { TierBadge, TierExplanation, type Tier } from "@/components/TierBadge";
import { formatDate } from "@/lib/format";
import { IconThread, IconArrowRight, IconShield, IconCheck } from "@/components/icons";

type Props = {
  artisan: {
    id: string;
    fullName: string;
    craft: string;
    region: string;
    state: string;
    bio: string | null;
    photoUrl: string | null;
    tier: string;
    pehchan: { masked: string; docUrl: string | null } | null;
  };
  gi: { giNumber: string; giName: string; datasetVersion: number; checkedAt: string } | null;
  products: {
    id: string;
    title: string;
    category: string;
    photoUrl: string | null;
    sealedAt: string | null;
    giNumber: string | null;
  }[];
};

export function ArtisanProfileView({ artisan, gi, products }: Props) {
  const t = useT();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-base">
        <Link href="/artisans" className="text-indigo hover:underline">
          {t("artisans.title")}
        </Link>
        <span className="px-2 text-muted">/</span>
        <span className="text-muted">{artisan.fullName}</span>
      </nav>

      <header className="grid gap-6 sm:grid-cols-[220px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artisan.photoUrl ?? "/samples/hero.svg"}
          alt={`${artisan.fullName}, ${artisan.craft} artisan`}
          className="aspect-square w-full rounded-2xl object-cover shadow-card"
          width={440}
          height={440}
        />
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold">{artisan.fullName}</h1>
          <p className="text-lg text-muted">
            {artisan.craft} · {artisan.region}, {artisan.state}
          </p>
          <TierBadge tier={artisan.tier as Tier} />
          {/* Hanging punctuation: where the bio opens with a quotation mark,
              the mark sits in the margin so the optical left edge stays true
              against the heading above it. Safari honours the property; the
              text-indent carries it elsewhere. Both degrade to an ordinary
              paragraph, so there is nothing to detect and nothing to break. */}
          {artisan.bio ? (
            <p className="hang-punct max-w-2xl text-base">{artisan.bio}</p>
          ) : null}
        </div>
      </header>

      {/* Verification detail */}
      <section aria-labelledby="verify-heading" className="space-y-3">
        <h2 id="verify-heading" className="text-xl font-bold">
          {t("profile.verification")}
        </h2>
        <TierExplanation tier={artisan.tier as Tier} />
        {artisan.pehchan ? (
          <Card className="border-l-4 border-teal">
            <div className="flex items-start gap-3">
              <IconShield width={22} height={22} className="mt-1 text-teal-700" />
              <div>
                <p className="font-semibold">
                  {t("profile.pehchan")}: <span className="product-id font-mono">{artisan.pehchan.masked}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-teal-700">
                  <IconCheck width={15} height={15} /> {t("profile.pehchanVerified")}
                </p>
              </div>
              {artisan.pehchan.docUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artisan.pehchan.docUrl}
                  alt={t("profile.pehchan")}
                  className="ml-auto h-16 w-24 rounded-md object-cover shadow-card"
                />
              ) : null}
            </div>
          </Card>
        ) : null}
        {gi ? (
          <Card className="border-l-4 border-indigo">
            <div className="flex items-start gap-3">
              <IconThread width={22} height={22} className="mt-1 text-indigo" />
              <div>
                <p className="font-semibold">
                  {gi.giName} · {gi.giNumber}
                </p>
                {/* Provenance of the check is ALWAYS shown — never implies a live gov API. */}
                <p className="mt-1 text-sm text-muted">
                  {t("ocr.giProvenance", { date: formatDate(gi.checkedAt) })} · dataset v
                  {gi.datasetVersion}
                </p>
              </div>
            </div>
          </Card>
        ) : null}
      </section>

      {/* Documented items */}
      <section aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-4 text-xl font-bold">
          {t("profile.items")}
        </h2>
        {products.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-base text-muted shadow-card">
            {t("profile.noItems")}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/product/${p.id}`}
                  className="group flex h-full flex-col rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-lift"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photoUrl ?? "/samples/hero.svg"}
                    alt={p.title}
                    className="aspect-[4/3] w-full rounded-t-2xl object-cover"
                    width={480}
                    height={360}
                  />
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <h3 className="font-bold group-hover:text-indigo">{p.title}</h3>
                    <p className="text-sm text-muted">{p.category}</p>
                    {p.giNumber ? (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal-700">
                        <IconThread width={13} height={13} /> {t("profile.giVerified")} · {p.giNumber}
                      </span>
                    ) : null}
                    {p.sealedAt ? (
                      <p className="text-sm text-muted">
                        {t("verify.recordedOn")}: {formatDate(p.sealedAt)}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 font-semibold text-indigo">
                      {t("nav.lookup")} <IconArrowRight width={16} height={16} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
