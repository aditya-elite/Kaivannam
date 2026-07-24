"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading } from "@/components/ui";
import { TierBadge, type Tier } from "@/components/TierBadge";
import { EmptyMotif } from "@/components/craft/EmptyMotif";
import { Reveal } from "@/components/craft/Reveal";
import { Rule } from "@/components/ui";
import { dyeLotColor } from "@/lib/dyelot";
import { IconSearch, IconArrowRight } from "@/components/icons";

type Artisan = {
  id: string;
  fullName: string;
  craft: string;
  region: string;
  state: string;
  tier: string;
  photoUrl: string | null;
  productCount: number;
};

export function ArtisansView({ artisans }: { artisans: Artisan[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [craft, setCraft] = useState("");
  const [state, setState] = useState("");

  const crafts = useMemo(
    () => Array.from(new Set(artisans.map((a) => a.craft))).sort(),
    [artisans],
  );
  const states = useMemo(
    () => Array.from(new Set(artisans.map((a) => a.state))).sort(),
    [artisans],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return artisans.filter((a) => {
      if (craft && a.craft !== craft) return false;
      if (state && a.state !== state) return false;
      if (!needle) return true;
      return (
        a.fullName.toLowerCase().includes(needle) ||
        a.craft.toLowerCase().includes(needle) ||
        a.region.toLowerCase().includes(needle) ||
        a.state.toLowerCase().includes(needle)
      );
    });
  }, [artisans, q, craft, state]);

  return (
    <div>
      <SectionHeading sub={t("artisans.subtitle")}>{t("artisans.title")}</SectionHeading>

      {/* Filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="artisan-search" className="sr-only">
            {t("artisans.searchPlaceholder")}
          </label>
          <IconSearch
            width={20}
            height={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="artisan-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("artisans.searchPlaceholder")}
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface pl-11 pr-4 text-base focus:border-teal"
          />
        </div>
        <div>
          <label htmlFor="craft-filter" className="sr-only">
            {t("artisans.filterCraft")}
          </label>
          <select
            id="craft-filter"
            value={craft}
            onChange={(e) => setCraft(e.target.value)}
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
          >
            <option value="">{t("artisans.allCrafts")}</option>
            {crafts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="state-filter" className="sr-only">
            {t("artisans.filterState")}
          </label>
          <select
            id="state-filter"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
          >
            <option value="">{t("artisans.allStates")}</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-4 text-base font-semibold text-muted" role="status" aria-live="polite">
        {t("artisans.count", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <EmptyMotif title={t("empty.title")} body={t("artisans.empty")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            /* cols=3 matches the widest breakpoint, so the reveal runs as a
               wave along the diagonal rather than as a queue down the DOM. */
            <Reveal as="li" key={a.id} index={i} cols={3}>
              <Link
                href={`/artisans/${a.id}`}
                /* §2.1 sheared corner instead of a uniform radius — the card
                   stops reading as a stamped unit. */
                className="group row-shear flex h-full flex-col bg-surface shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.photoUrl ?? "/samples/hero.png"}
                    alt={`Craft by ${a.fullName}, ${a.craft}`}
                    className="aspect-[4/3] w-full object-cover"
                    width={480}
                    height={360}
                  />
                  {/* Craft objects are numbered. One span, and the grid stops
                      looking like search results. */}
                  <span className="product-id absolute bottom-2 right-2 bg-ink/75 px-1.5 py-1 font-mono text-[11px] font-bold text-cream">
                    NO. {String(i + 1).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h2 className="text-lg font-bold group-hover:text-indigo">{a.fullName}</h2>
                  {/* Dye-lot accent: decorative only, no text sits on it, so
                      the hue drift cannot affect any contrast ratio. */}
                  <span
                    aria-hidden="true"
                    className="my-1 block h-[3px] w-10"
                    style={{ background: dyeLotColor(i) }}
                  />
                  <p className="text-base text-muted">{a.craft}</p>
                  <p className="text-base text-muted">
                    {a.region}, {a.state}
                  </p>
                  <Rule className="my-2" />
                  <div>
                    <TierBadge tier={a.tier as Tier} size="sm" />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {t("artisans.products", { count: a.productCount })}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 font-semibold text-indigo">
                    {t("artisans.viewProfile")} <IconArrowRight width={16} height={16} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
