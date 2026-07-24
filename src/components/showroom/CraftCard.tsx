"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { TierBadge, type Tier } from "@/components/TierBadge";
import { FavoriteButton } from "./FavoriteButton";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { dyeLotColor } from "@/lib/dyelot";
import { IconThread, IconShield, IconQr } from "@/components/icons";

export type Piece = {
  id: string;
  title: string;
  category: string;
  storyText: string | null;
  priceLabel: string;
  /** Listed, priced and in stock — same test the storefront applies. */
  forSale: boolean;
  stock: number;
  giVerified: boolean;
  giNumber: string | null;
  verifiedOn: string;
  artisan: { id: string; fullName: string; region: string; state: string; tier: string };
  image: string;
};

/**
 * A piece on its stand.
 *
 * The card is built around one idea: on a provenance platform the *maker* is
 * not metadata, so the artisan's name and the verification tier sit above the
 * price rather than in small grey text beneath it. An ecommerce card leads with
 * price and treats the seller as a footnote; this one is deliberately the other
 * way round.
 *
 * Structure worth noting:
 *   · One link wraps the image and the title, not the whole card. A card-sized
 *     anchor swallows the favourite button and the artisan link, and reads as a
 *     single enormous target in a screen reader's link list.
 *   · The favourite button is a sibling of the link, never nested inside it —
 *     interactive elements cannot nest.
 *   · Hover effects live on `.stand`, which reacts to `:focus-within` too, so
 *     keyboard users get the same lift and shimmer as mouse users.
 */
export function CraftCard({
  piece,
  index = 0,
  feature = false,
}: {
  piece: Piece;
  index?: number;
  /**
   * The piece under the lamp. Its image gets a wider, shallower crop and a
   * hard pixel ceiling — a 4:5 portrait in a column this wide renders a
   * ~700px-tall image that pushes the maker's name and the price clean off
   * the first screen, which defeats the point of featuring it.
   */
  feature?: boolean;
}) {
  const t = useT();
  const story = piece.storyText?.trim();
  // ~92 chars is roughly two lines at card width. Cut on a word boundary so the
  // preview never ends mid-word.
  const preview =
    story && story.length > 92 ? story.slice(0, story.lastIndexOf(" ", 92)) + "…" : story;

  // The collection is now the single browse-and-buy surface (the standalone shop
  // was folded in). A buyable piece opens the buy detail; a documented-only piece
  // opens its provenance record.
  const detailHref = piece.forSale ? `/shop/${piece.id}` : `/product/${piece.id}`;

  return (
    <article className="stand shear-shadow-rest relative h-full">
      {/* Warm plate. `row-shear` gives the sheared bottom-right corner from
          §2.1 so a row of these never reads as identical stamped units.
          The card's own shadow lives on `.stand` as a drop-shadow (shear-shadow-rest)
          because a clip-path would clip a box-shadow to nothing. */}
      <div className="row-shear flex h-full flex-col bg-surface">
        {/* Both variants are ratio-driven with a hard pixel ceiling. Letting
            the featured image flex to fill its grid cell looked right in
            principle and was wrong in practice: the cell next to it holds two
            stacked cards, so the image stretched to ~900px and swamped the
            shelf. The row is asymmetric by design and does not need its two
            columns to be the same height. */}
        <div
          className={`shimmer zoom-frame relative w-full bg-cream ${
            feature ? "aspect-[16/10] max-h-[420px]" : "aspect-[4/5] max-h-[340px]"
          }`}
        >
          <Link
            href={detailHref}
            className="block h-full w-full"
            tabIndex={-1}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={piece.image}
              alt=""
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
              /* Crop from the top. The placeholder artwork in /public/samples
                 carries a caption baked into the bottom of each SVG; anchoring
                 the crop high pushes it out of frame instead of leaving it
                 sitting across the shelf. Replace the sample art and this stays
                 correct anyway — the subject of a craft photograph belongs in
                 the upper two-thirds. */
              className="h-full w-full object-cover object-top"
              width={480}
              height={600}
            />
          </Link>

          {/* Light falling from above onto the piece, and the shadow gathering
              at its base where it meets the shelf. The lower scrim is doing
              real lighting work, and it also settles the label that the
              placeholder artwork carries in its bottom-left corner. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,236,194,0.34) 0%, transparent 100%)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4"
            style={{
              background:
                "linear-gradient(0deg, rgba(60,34,15,0.30) 0%, transparent 100%)",
            }}
          />

          {/* Verification mark. Only shown where the record is GI-backed —
              a badge that appears on everything signals nothing. */}
          {piece.giVerified ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 bg-teal/95 px-2.5 py-1.5 text-xs font-bold text-white">
              <IconShield width={14} height={14} className="qr-pulse" />
              {t("shop.giBacked")}
            </span>
          ) : null}

          <div className="absolute right-3 top-3">
            <FavoriteButton
              id={piece.id}
              title={piece.title}
              label={t("shop.save")}
              savedLabel={t("shop.saved")}
            />
          </div>
        </div>

        {/* `row-shear` clips a 22px wedge off the bottom-right corner, so that
            corner is not safe to put content in — the GI number was being cut
            in half by it. The extra right and bottom padding keeps the last
            row clear of the diagonal. */}
        {/* On the featured card the IMAGE absorbs the spare height, so the body
            must size to its content — leaving both on flex-1 makes them split
            the slack and opens a void above the price. In a normal row the body
            does stretch, because that is what aligns every price to the same
            baseline across the shelf. */}
        <div className={`flex flex-col gap-2 p-4 pb-6 pr-7 ${feature ? "" : "flex-1"}`}>
          {/* The maker comes first. */}
          <div className="flex items-center gap-2">
            <TierBadge tier={piece.artisan.tier as Tier} size="sm" />
          </div>

          <h3 className="text-lg font-bold leading-snug">
            <Link
              href={detailHref}
              className="text-ink hover:text-indigo hover:underline"
            >
              {piece.title}
            </Link>
          </h3>

          {/* Dye-lot accent — decorative, no text on it, so the hue drift
              cannot move any contrast ratio. */}
          <span
            aria-hidden="true"
            className="block h-[3px] w-9"
            style={{ background: dyeLotColor(index, "terracotta", 5) }}
          />

          <p className="text-sm text-muted">
            <Link href={`/artisans/${piece.artisan.id}`} className="font-semibold text-ink hover:underline">
              {piece.artisan.fullName}
            </Link>
            {" · "}
            {piece.artisan.region}, {piece.artisan.state}
          </p>

          {preview ? (
            <p className="hang-punct text-sm leading-relaxed text-muted">“{preview}”</p>
          ) : null}

          {/* flex-wrap + min-w-0: the GI number is tracked monospace and the
              price string varies with locale, so on a narrow card the two must
              be able to stack rather than push each other out of the box. */}
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
            <div className="min-w-0">
              <p className="type-label text-muted">{t("shop.price")}</p>
              <p className="product-id text-lg font-extrabold text-ink">{piece.priceLabel}</p>
              {/* Availability is stated, not implied. "Last one" is a fact off
                  the stock column, not a pressure tactic — a single-maker
                  workshop genuinely does have one of most things. */}
              {piece.forSale && piece.stock <= 2 ? (
                <p className="mt-0.5 text-xs font-semibold text-terracotta">
                  {piece.stock === 1 ? t("shop.lastOne") : t("shop.fewLeft", { count: piece.stock })}
                </p>
              ) : null}
            </div>
            {piece.giNumber ? (
              <p className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700">
                <IconThread width={13} height={13} className="shrink-0" />
                <span className="product-id">{piece.giNumber}</span>
              </p>
            ) : null}
          </div>

          {/* Buy from the collection directly — the shop's add-to-cart, folded in.
              A documented-only piece shows a quiet "see the full record" link
              instead, so every card still leads somewhere. */}
          {piece.forSale ? (
            <AddToCartButton productId={piece.id} full className="mt-3" />
          ) : (
            <Link
              href={`/product/${piece.id}`}
              className="press mt-3 inline-flex min-h-tap items-center justify-center gap-2 rounded-xl border-2 border-ink/20 px-4 py-2.5 text-base font-semibold text-ink hover:border-ink/40"
            >
              <IconQr width={18} height={18} /> {t("shop.viewRecord")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
