import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
// Money comes from lib/money — integer paise is the single representation for
// prices across the shop, the cart and this page. See the merge note in
// prisma/schema.prisma.
import { formatINR } from "@/lib/money";
import { CollectionView } from "@/components/views/CollectionView";
import type { Piece } from "@/components/showroom/CraftCard";

export const metadata: Metadata = {
  title: "The Collection — Kaivannam",
  description:
    "Documented handcrafted pieces from verified Indian artisans. Every piece carries a sealed record of who made it, where, and how.",
};

/** Stage photos are stored as a JSON array of URLs in a single column. */
function firstPhoto(raw: string): string | null {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr) && typeof arr[0] === "string") return arr[0];
  } catch {
    /* Malformed row — fall through to the caller's default. */
  }
  return null;
}

export default async function CollectionPage() {
  const { t } = await getI18n();

  // Only sealed pieces appear in the room. A draft is an unfinished record and
  // has no business being browsed as merchandise.
  const rows = await db.product.findMany({
    where: { status: "SEALED" },
    orderBy: { sealedAt: "desc" },
    include: {
      artisan: {
        select: { id: true, fullName: true, region: true, state: true, tier: true },
      },
      stages: {
        orderBy: { capturedAt: "desc" },
        select: { stage: true, photoUrls: true },
      },
    },
  });

  const pieces: Piece[] = rows.map((p) => {
    // Prefer the COMPLETED frame — that is the finished object. Fall back to
    // the most recent stage that has any photo at all.
    const completed = p.stages.find((s) => s.stage === "COMPLETED");
    const image =
      (completed && firstPhoto(completed.photoUrls)) ??
      p.stages.map((s) => firstPhoto(s.photoUrls)).find(Boolean) ??
      "/samples/hero.png";

    return {
      id: p.id,
      title: p.title,
      category: p.category,
      storyText: p.storyText,
      // Formatted on the server so the card never has to think about locales.
      priceLabel: p.priceInPaise == null ? t("shop.priceOnRequest") : formatINR(p.priceInPaise),
      // Buyable only when it is listed, priced and actually in stock — the same
      // condition the storefront uses, so the two pages can never disagree
      // about whether something can be bought.
      forSale: p.listedForSale && p.stock > 0 && p.priceInPaise != null,
      stock: p.stock,
      giVerified: p.giVerified,
      giNumber: p.giVerified ? p.giNumber : null,
      verifiedOn: p.sealedAt ? formatDate(p.sealedAt) : "",
      artisan: p.artisan,
      image,
    };
  });

  const makers = new Set(pieces.map((p) => p.artisan.id)).size;

  return <CollectionView pieces={pieces} makers={makers} />;
}
