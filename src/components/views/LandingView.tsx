"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { ButtonLink, Card } from "@/components/ui";
import { TierBadge, type Tier } from "@/components/TierBadge";
import {
  IconQr,
  IconUser,
  IconShield,
  IconCamera,
  IconArrowRight,
  IconThread,
} from "@/components/icons";

type Featured = {
  id: string;
  fullName: string;
  craft: string;
  region: string;
  state: string;
  tier: string;
  photoUrl: string | null;
  productCount: number;
};

export function LandingView({
  stats,
  featured,
}: {
  stats: { artisans: number; products: number };
  featured: Featured[];
}) {
  const t = useT();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo to-indigo-700 px-6 py-12 text-white sm:px-10 sm:py-16">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
          <IconThread width={16} height={16} /> {t("app.tagline")}
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90">{t("home.heroSub")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/lookup" variant="primary">
            <IconQr width={20} height={20} /> {t("home.ctaCheck")}
          </ButtonLink>
          <ButtonLink
            href="/artisans"
            variant="outline"
            className="border-white/40 !bg-white/10 !text-white hover:!border-white"
          >
            <IconUser width={20} height={20} /> {t("home.ctaBrowse")}
          </ButtonLink>
        </div>
        <dl className="mt-10 flex gap-8">
          <div>
            <dt className="text-sm uppercase tracking-wide text-white/70">
              {t("nav.artisans")}
            </dt>
            <dd className="text-3xl font-extrabold">{stats.artisans}</dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-wide text-white/70">
              {t("verify.timeline")}
            </dt>
            <dd className="text-3xl font-extrabold">{stats.products}</dd>
          </div>
        </dl>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-bold sm:text-3xl">
          {t("nav.how")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { Icon: IconCamera, title: t("home.step1Title"), body: t("home.step1Body") },
            { Icon: IconShield, title: t("home.step2Title"), body: t("home.step2Body") },
            { Icon: IconQr, title: t("home.step3Title"), body: t("home.step3Body") },
          ].map((s, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-haldi/20 text-terracotta">
                <s.Icon width={26} height={26} />
              </span>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-base text-muted">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured artisans */}
      <section aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-2xl font-bold sm:text-3xl">
            {t("home.ctaBrowse")}
          </h2>
          <Link
            href="/artisans"
            className="inline-flex min-h-tap items-center gap-1 font-semibold text-indigo hover:underline"
          >
            {t("artisans.title")} <IconArrowRight width={18} height={18} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {featured.map((a) => (
            <Link
              key={a.id}
              href={`/artisans/${a.id}`}
              className="group rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-lift"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.photoUrl ?? "/samples/hero.svg"}
                alt={`Craft work by ${a.fullName}, ${a.craft} artisan from ${a.region}`}
                className="aspect-square w-full rounded-t-2xl object-cover"
                width={480}
                height={480}
              />
              <div className="space-y-2 p-4">
                <h3 className="text-lg font-bold group-hover:text-indigo">{a.fullName}</h3>
                <p className="text-base text-muted">
                  {a.craft} · {a.region}, {a.state}
                </p>
                <TierBadge tier={a.tier as Tier} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust / infra reality */}
      <section className="rounded-3xl bg-terracotta px-6 py-10 text-white sm:px-10">
        <h2 className="max-w-xl text-2xl font-bold sm:text-3xl">{t("home.trustTitle")}</h2>
        <p className="mt-3 max-w-xl text-lg text-white/90">{t("home.trustBody")}</p>
        <div className="mt-6">
          <ButtonLink
            href="/register"
            variant="outline"
            className="border-white/40 !bg-white !text-terracotta hover:!bg-white/90"
          >
            <IconCamera width={20} height={20} /> {t("home.ctaRegister")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
