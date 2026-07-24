"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Ambience, BlockPrintDivider } from "@/components/showroom/Ambience";
import { ShowroomHero } from "@/components/showroom/ShowroomHero";
import { CategoryRail, type Category } from "@/components/showroom/CategoryRail";
import { CraftCard, type Piece } from "@/components/showroom/CraftCard";
import { Shelf, ShelfItem } from "@/components/showroom/Shelf";
import { Kolam } from "@/components/craft/Kolam";
import { EmptyMotif } from "@/components/craft/EmptyMotif";
import { dyeLotColor } from "@/lib/dyelot";
import { IconArrowRight, IconShield, IconClock, IconThread } from "@/components/icons";

/**
 * THE COLLECTION — the showroom floor.
 *
 * Composed as a room the visitor walks through rather than as a catalogue they
 * page through: a lit shopfront, then shelves at different depths, separated by
 * printed borders instead of horizontal rules.
 *
 * Two decisions worth defending:
 *
 * 1. Every section is a real query over real sealed records. "Recommended" is
 *    computed from what this visitor has actually saved, and says plainly when
 *    it has nothing to go on. "Nearby" asks which state you are in rather than
 *    silently requesting geolocation. A showroom that invents its own signals
 *    is a showroom that is lying, and this product's entire subject is not
 *    lying about provenance.
 *
 * 2. The maker leads every card, above the price. On a provenance platform the
 *    artisan is the product; an ecommerce card treats the seller as a footnote
 *    and that is precisely the look being avoided here.
 */

const FAV_KEY = "ks_favorites";
const STATE_KEY = "ks_home_state";

/**
 * The section's real heading. It carries the `id` that the surrounding
 * <section> points at with aria-labelledby, so there is exactly ONE heading per
 * section in the outline.
 *
 * The first version of this rendered a visible <h2> here and a second sr-only
 * <h2> to own the id, which put every section title into the heading outline
 * twice — a screen-reader user navigating by heading heard "Recently verified,
 * Recently verified". One heading, one id.
 */
function SectionHead({
  id,
  label,
  title,
  sub,
  href,
  hrefLabel,
}: {
  id: string;
  label: string;
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="type-label text-terracotta">{label}</p>
        <h2 id={id} className="letterpress mt-2 text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        {sub ? <p className="mt-2 max-w-2xl text-base text-muted">{sub}</p> : null}
      </div>
      {href && hrefLabel ? (
        <Link
          href={href}
          className="inline-flex min-h-tap items-center gap-1 font-semibold text-indigo hover:underline"
        >
          {hrefLabel} <IconArrowRight width={18} height={18} />
        </Link>
      ) : null}
    </div>
  );
}

/** A row of pieces standing on a wooden shelf. */
function ShelfRow({ pieces, cols = 4 }: { pieces: Piece[]; cols?: 3 | 4 }) {
  const grid =
    cols === 3
      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-5 sm:grid-cols-2 lg:grid-cols-4";
  return (
    <Shelf>
      <ul className={grid}>
        {pieces.map((p, i) => (
          <ShelfItem key={p.id} index={i} className="h-full">
            <li className="h-full list-none">
              <CraftCard piece={p} index={i} />
            </li>
          </ShelfItem>
        ))}
      </ul>
    </Shelf>
  );
}

export function CollectionView({ pieces, makers }: { pieces: Piece[]; makers: number }) {
  const t = useT();
  const [craft, setCraft] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [homeState, setHomeState] = useState<string | null>(null);

  // Client-only preferences. Read after mount, never during render — reading
  // localStorage while rendering is a hydration mismatch waiting to happen.
  useEffect(() => {
    try {
      const f = localStorage.getItem(FAV_KEY);
      if (f) setFavorites(JSON.parse(f) as string[]);
      setHomeState(localStorage.getItem(STATE_KEY));
    } catch {
      /* Private mode — the page works without preferences. */
    }
  }, []);

  const categories: Category[] = useMemo(() => {
    const m = new Map<string, { count: number; state: string }>();
    for (const p of pieces) {
      const prev = m.get(p.category);
      m.set(p.category, { count: (prev?.count ?? 0) + 1, state: prev?.state ?? p.artisan.state });
    }
    return [...m.entries()]
      .map(([name, v]) => ({ name, count: v.count, state: v.state }))
      .sort((a, b) => b.count - a.count);
  }, [pieces]);

  const states = useMemo(
    () => [...new Set(pieces.map((p) => p.artisan.state))].sort(),
    [pieces],
  );

  // Featured — the strongest provenance in the room: GI-backed first, then by
  // how thoroughly the maker's own identity has been checked.
  const TIER_RANK: Record<string, number> = {
    GI_AUTHORISED: 5, COOP_VOUCHED: 4, ID_VERIFIED: 3, DOCS_PENDING: 2, SELF_DECLARED: 1,
  };
  const featured = useMemo(
    () =>
      [...pieces]
        .sort(
          (a, b) =>
            Number(b.giVerified) - Number(a.giVerified) ||
            (TIER_RANK[b.artisan.tier] ?? 0) - (TIER_RANK[a.artisan.tier] ?? 0),
        )
        .slice(0, 3),
    [pieces],
  );

  // `pieces` arrives sorted by sealedAt desc from the server.
  const recentlyVerified = useMemo(() => pieces.slice(0, 4), [pieces]);
  const newArrivals = useMemo(() => [...pieces].reverse().slice(0, 4), [pieces]);

  // Recommended — derived from the crafts this visitor has actually saved.
  const savedCrafts = useMemo(() => {
    const set = new Set<string>();
    for (const p of pieces) if (favorites.includes(p.id)) set.add(p.category);
    return set;
  }, [pieces, favorites]);

  const recommended = useMemo(() => {
    if (savedCrafts.size === 0) return [];
    return pieces.filter((p) => savedCrafts.has(p.category) && !favorites.includes(p.id)).slice(0, 4);
  }, [pieces, savedCrafts, favorites]);

  const nearby = useMemo(
    () => (homeState ? pieces.filter((p) => p.artisan.state === homeState).slice(0, 4) : []),
    [pieces, homeState],
  );

  const shown = useMemo(
    () => (craft ? pieces.filter((p) => p.category === craft) : pieces),
    [pieces, craft],
  );

  function chooseState(s: string | null) {
    setHomeState(s);
    try {
      if (s) localStorage.setItem(STATE_KEY, s);
      else localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <Ambience />

      {/* Everything below sits above the ambient layers. */}
      <div className="relative z-[1]">
        <ShowroomHero pieces={pieces.length} makers={makers} />

        <BlockPrintDivider />

        {/* ── Traditional categories ─────────────────────────────────────── */}
        <section aria-labelledby="cat-heading">
          <SectionHead
            id="cat-heading"
            label={t("shop.categoriesLabel")}
            title={t("shop.categories")}
            sub={t("shop.categoriesSub")}
          />
          <CategoryRail categories={categories} active={craft} onSelect={setCraft} />
        </section>

        <BlockPrintDivider />

        {/* ── Featured collection ────────────────────────────────────────── */}
        <section aria-labelledby="feat-heading" className="spotlight">
          <SectionHead
            id="feat-heading"
            label={t("shop.featuredLabel")}
            title={t("shop.featured")}
            sub={t("shop.featuredSub")}
          />
          {/* Asymmetric on purpose: the first piece is the one under the lamp. */}
          {/* items-start: the two columns hold different amounts of content
              and stretching them to match is what produced a 900px-tall
              featured image. Asymmetry is the point of this row. */}
          <Shelf>
            <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
              {featured[0] ? (
                <ShelfItem index={0}>
                  <CraftCard piece={featured[0]} index={0} feature />
                </ShelfItem>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {featured.slice(1).map((p, i) => (
                  <ShelfItem key={p.id} index={i + 1} className="h-full">
                    <CraftCard piece={p} index={i + 1} />
                  </ShelfItem>
                ))}
              </div>
            </div>
          </Shelf>
        </section>

        <Kolam />

        {/* ── Recently verified ──────────────────────────────────────────── */}
        <section aria-labelledby="recent-heading">
          <SectionHead
            id="recent-heading"
            label={t("shop.recentLabel")}
            title={t("shop.recent")}
            sub={t("shop.recentSub")}
          />
          <ShelfRow pieces={recentlyVerified} />
        </section>

        <BlockPrintDivider />

        {/* ── New arrivals ───────────────────────────────────────────────── */}
        <section aria-labelledby="new-heading">
          <SectionHead
            id="new-heading"
            label={t("shop.newLabel")}
            title={t("shop.new")}
            sub={t("shop.newSub")}
          />
          <ShelfRow pieces={newArrivals} />
        </section>

        <BlockPrintDivider />

        {/* ── Popular crafts (clusters, not pieces) ──────────────────────── */}
        <section aria-labelledby="popular-heading">
          <SectionHead
            id="popular-heading"
            label={t("shop.popularLabel")}
            title={t("shop.popular")}
            sub={t("shop.popularSub")}
          />
          <Shelf>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c, i) => (
                <ShelfItem key={c.name} index={i} className="h-full">
                  <li className="h-full list-none">
                    <button
                      type="button"
                      onClick={() => {
                        setCraft(c.name);
                        document.getElementById("collection")?.scrollIntoView({ block: "start" });
                      }}
                      className="stand row-shear-alt block h-full w-full bg-surface p-5 text-left shadow-card"
                    >
                      <span
                        aria-hidden="true"
                        className="mb-3 block h-1 w-12"
                        style={{ background: dyeLotColor(i, "haldi", 41) }}
                      />
                      <span className="block text-lg font-bold text-ink">{c.name}</span>
                      <span className="mt-1 block text-sm text-muted">{c.state}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo">
                        {t("shop.pieceCount", { count: c.count })}
                        <IconArrowRight width={14} height={14} />
                      </span>
                    </button>
                  </li>
                </ShelfItem>
              ))}
            </ul>
          </Shelf>
        </section>

        <BlockPrintDivider />

        {/* ── Recommended — honest about where it comes from ─────────────── */}
        <section aria-labelledby="rec-heading">
          <SectionHead
            id="rec-heading"
            label={t("shop.recLabel")}
            title={recommended.length ? t("shop.rec") : t("shop.recEmptyTitle")}
            sub={recommended.length ? t("shop.recSub") : t("shop.recEmptySub")}
          />
          {recommended.length ? (
            <ShelfRow pieces={recommended} />
          ) : (
            <div className="flex items-start gap-3 border-l-2 border-haldi bg-surface/70 p-5">
              <IconThread width={22} height={22} className="mt-0.5 shrink-0 text-terracotta" />
              <p className="text-base text-muted">{t("shop.recEmptyBody")}</p>
            </div>
          )}
        </section>

        <BlockPrintDivider />

        {/* ── Nearby — asks, never assumes ───────────────────────────────── */}
        <section aria-labelledby="near-heading">
          <SectionHead
            id="near-heading"
            label={t("shop.nearbyLabel")}
            title={t("shop.nearby")}
            sub={t("shop.nearbySub")}
          />

          <div className="mb-6 max-w-sm">
            <label htmlFor="home-state" className="mb-2 block text-base font-semibold">
              {t("shop.yourState")}
            </label>
            <select
              id="home-state"
              value={homeState ?? ""}
              onChange={(e) => chooseState(e.target.value || null)}
              className="min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base transition-colors hover:border-ink/45 focus:border-terracotta"
            >
              <option value="">{t("shop.chooseState")}</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted">{t("shop.stateNote")}</p>
          </div>

          {homeState ? (
            nearby.length ? (
              <ShelfRow pieces={nearby} />
            ) : (
              <EmptyMotif title={t("empty.title")} body={t("shop.nearbyEmpty")} />
            )
          ) : null}
        </section>

        <Kolam />

        {/* ── The full floor ─────────────────────────────────────────────── */}
        <section id="collection" aria-labelledby="all-heading" className="scroll-mt-24">
          <SectionHead
            id="all-heading"
            label={t("shop.allLabel")}
            title={craft ?? t("shop.all")}
            sub={t("shop.allSub")}
          />

          <p className="mb-5 flex flex-wrap items-center gap-3 text-base font-semibold text-muted" role="status" aria-live="polite">
            <IconShield width={17} height={17} className="text-teal-700" />
            {t("shop.showing", { count: shown.length })}
            {craft ? (
              <button
                type="button"
                onClick={() => setCraft(null)}
                className="press inline-flex min-h-tap items-center gap-1 text-indigo hover:underline"
              >
                {t("shop.clearFilter")}
              </button>
            ) : null}
          </p>

          {shown.length === 0 ? (
            <EmptyMotif title={t("empty.title")} body={t("shop.noneInCraft")} />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p, i) => (
                <li key={p.id} className="h-full">
                  <CraftCard piece={p} index={i} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Closing note — the room's whole argument in one line. */}
        <section className="mt-16">
          <div className="row-shear bg-terracotta px-6 py-10 text-white sm:px-10">
            <p className="type-label text-white/75">{t("shop.closingLabel")}</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold sm:text-3xl">
              {t("shop.closingTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-white/90">{t("shop.closingBody")}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/85">
              <IconClock width={16} height={16} /> {t("shop.closingNote")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
