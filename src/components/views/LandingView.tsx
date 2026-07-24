"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { ButtonLink } from "@/components/ui";
import { TierBadge, type Tier } from "@/components/TierBadge";
import { HeroWeave } from "@/components/craft/HeroWeave";
import { Spine } from "@/components/craft/Spine";
import { Kolam } from "@/components/craft/Kolam";
import { Reveal } from "@/components/craft/Reveal";
import { roughClasses } from "@/lib/rough";
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

/**
 * TIER A — hand-composed (§1). One of the two screens that carry the product's
 * whole emotional weight, so the composition here is deliberate rather than
 * derived from a grid: cropped display type, a diagonal spine, illustration
 * bleed, per-breakpoint placement.
 *
 * One feature animation on the screen — the warp-and-weft reveal (§3.1).
 * Everything else is sub-250ms feedback or a scroll reveal.
 *
 * On §2.5: the display type sits over a solid indigo gradient, not over an
 * illustration. Both stops (#2E3192 and #262A7A) clear 9:1 against white, so
 * the lightest and darkest pixels behind every glyph are known at every
 * viewport width and no opaque-plate fallback is needed. The threads drawn over
 * it are hairlines at ≤45% opacity and do not move that measurement. The moment
 * an actual illustration goes behind this text, the four §2.5 conditions apply
 * and a plate fallback becomes mandatory.
 */
export function LandingView({
  stats,
  featured,
}: {
  stats: { artisans: number; products: number };
  featured: Featured[];
}) {
  const t = useT();
  const edges = roughClasses(featured.length + 3, 11);

  return (
    <div>
      {/* ── Hero (Tier A) ─────────────────────────────────────────────────── */}
      <HeroWeave>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo to-indigo-700 px-5 pb-12 pt-10 text-white sm:px-10 sm:pb-16 sm:pt-14">
          {/* §3.6 — parallax edge ornament, scroll-driven where supported and
              silently absent where not. A JS scroll listener would cost more
              than the effect is worth on a low-end phone. */}
          <span
            aria-hidden="true"
            className="border-ornament pointer-events-none absolute right-0 top-0 h-[140%] w-6 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, #E9A319 0 6px, transparent 6px 18px)",
            }}
          />

          <p className="hero-line type-label inline-flex items-center gap-2 text-haldi" style={{ "--delay": "850ms" } as React.CSSProperties}>
            <IconThread width={16} height={16} /> {t("app.tagline")}
          </p>

          {/* §3.2 — cropped display type. The visible wordmark bleeds past the
              container edge and is marked aria-hidden; the complete string
              lives in a visually-hidden <h1> right beside it, so a screen
              reader never announces a truncated word. */}
          <h1 className="sr-only">Kaivannam — {t("home.heroTitle")}</h1>
          <p
            aria-hidden="true"
            className="type-crop type-display type-distress -ml-1 mt-3 whitespace-nowrap text-white sm:-ml-3"
          >
            Kai<span className="text-haldi">vannam</span>
          </p>

          <p
            className="hero-line mt-4 max-w-xl text-lg text-white/90"
            style={{ "--delay": "930ms" } as React.CSSProperties}
          >
            {t("home.heroSub")}
          </p>

          {/* §2.2 — the spine. Baselines stay horizontal; only the alignment
              axis slants. Drift is capped so nothing escapes at 360px. */}
          <Spine className="mt-8 space-y-3">
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
          </Spine>

          {/* §2.6 — scale contrast: 13px tracked labels against the display
              type above, with nothing in the middle of the scale. */}
          <dl className="mt-10 flex gap-10">
            <div>
              <dt className="type-label text-white/70">{t("nav.artisans")}</dt>
              <dd className="text-4xl font-extrabold">{stats.artisans}</dd>
            </div>
            <div>
              <dt className="type-label text-white/70">{t("verify.timeline")}</dt>
              <dd className="text-4xl font-extrabold">{stats.products}</dd>
            </div>
          </dl>
        </section>
      </HeroWeave>

      <Kolam />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading">
        <p className="type-label text-muted">{t("nav.how")}</p>
        <h2 id="how-heading" className="mt-2 text-2xl font-bold sm:text-3xl">
          {t("home.step2Title")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { Icon: IconCamera, title: t("home.step1Title"), body: t("home.step1Body") },
            { Icon: IconShield, title: t("home.step2Title"), body: t("home.step2Body") },
            { Icon: IconQr, title: t("home.step3Title"), body: t("home.step3Body") },
          ].map((s, i) => (
            /* §3.3 — stamp-in, staggered 70ms. Three items, so the ink-bleed
               refinement is affordable here (skipped past six). */
            <Reveal key={i} index={i} bleed className="text-ink">
              <div className={`h-full bg-surface p-5 shadow-card ${edges[i]}`}>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-haldi/20 text-terracotta">
                  <s.Icon width={26} height={26} />
                </span>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-base text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Kolam />

      {/* ── Featured artisans ─────────────────────────────────────────────── */}
      <section aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="type-label text-muted">{t("artisans.title")}</p>
            <h2 id="featured-heading" className="mt-2 text-2xl font-bold sm:text-3xl">
              {t("home.ctaBrowse")}
            </h2>
          </div>
          <Link
            href="/artisans"
            className="inline-flex min-h-tap items-center gap-1 font-semibold text-indigo hover:underline"
          >
            {t("artisans.title")} <IconArrowRight width={18} height={18} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {featured.map((a, i) => (
            <Reveal key={a.id} index={i}>
              <Link
                href={`/artisans/${a.id}`}
                className="group block h-full rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-lift"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.photoUrl ?? "/samples/hero.svg"}
                  alt={`Craft work by ${a.fullName}, ${a.craft} artisan from ${a.region}`}
                  className="aspect-square w-full rounded-t-2xl object-cover"
                  width={480}
                  height={480}
                />
                {/* Tier B rule inside a Tier A page: text never sits on the
                    image. It gets its own opaque plate below it. */}
                <div className="space-y-2 p-4">
                  <h3 className="text-lg font-bold group-hover:text-indigo">{a.fullName}</h3>
                  <p className="text-base text-muted">
                    {a.craft} · {a.region}, {a.state}
                  </p>
                  <TierBadge tier={a.tier as Tier} size="sm" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Kolam />

      {/* ── Trust / infra reality ─────────────────────────────────────────── */}
      <Reveal>
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
      </Reveal>
    </div>
  );
}
