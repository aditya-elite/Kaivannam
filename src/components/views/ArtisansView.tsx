"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading } from "@/components/ui";
import { TierBadge, type Tier } from "@/components/TierBadge";
import { EmptyMotif } from "@/components/craft/EmptyMotif";
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
          {filtered.map((a) => (
            <li key={a.id}>
              <Link
                href={`/artisans/${a.id}`}
                className="group flex h-full flex-col rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-lift"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.photoUrl ?? "/samples/hero.svg"}
                  alt={`Craft by ${a.fullName}, ${a.craft}`}
                  className="aspect-[4/3] w-full rounded-t-2xl object-cover"
                  width={480}
                  height={360}
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="text-lg font-bold group-hover:text-indigo">{a.fullName}</h2>
                  <p className="text-base text-muted">
                    {a.craft} · {a.region}, {a.state}
                  </p>
                  <div className="mt-1">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
