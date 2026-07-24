import { db } from "./db";
import { STAGE_ORDER } from "./product-record";

/**
 * Storefront queries. A product is shoppable only when it is sealed (has a
 * verified provenance record), listed for sale, in stock, and priced.
 */

export type ShopCard = {
  id: string;
  title: string;
  category: string;
  pricePaise: number;
  stock: number;
  photoUrl: string | null;
  artisan: { id: string; fullName: string; region: string; state: string };
};

function firstPhoto(photoUrls: string | undefined): string | null {
  if (!photoUrls) return null;
  try {
    const arr = JSON.parse(photoUrls) as string[];
    return arr[0] ?? null;
  } catch {
    return null;
  }
}

export async function listShopProducts(): Promise<ShopCard[]> {
  const products = await db.product.findMany({
    where: { status: "SEALED", listedForSale: true, stock: { gt: 0 }, priceInPaise: { not: null } },
    orderBy: { sealedAt: "desc" },
    include: {
      artisan: true,
      stages: { orderBy: { capturedAt: "asc" }, take: 1 },
    },
  });
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    pricePaise: p.priceInPaise!,
    stock: p.stock,
    photoUrl: firstPhoto(p.stages[0]?.photoUrls),
    artisan: {
      id: p.artisan.id,
      fullName: p.artisan.fullName,
      region: p.artisan.region,
      state: p.artisan.state,
    },
  }));
}

export type ShopDetail = ShopCard & {
  materials: string;
  storyText: string | null;
  craft: string;
  listedForSale: boolean;
  photoUrls: string[];
};

export async function getShopProduct(id: string): Promise<ShopDetail | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: { artisan: true, stages: { orderBy: { capturedAt: "asc" } } },
  });
  if (!p || p.status !== "SEALED" || p.priceInPaise == null) return null;

  // Gather one photo per stage in canonical order for a small gallery.
  const photoUrls: string[] = [];
  for (const stageName of STAGE_ORDER) {
    const entry = p.stages
      .filter((s) => s.stage === stageName)
      .sort((a, b) => b.version - a.version)[0];
    const url = firstPhoto(entry?.photoUrls);
    if (url) photoUrls.push(url);
  }

  return {
    id: p.id,
    title: p.title,
    category: p.category,
    craft: p.artisan.craft,
    pricePaise: p.priceInPaise,
    stock: p.stock,
    listedForSale: p.listedForSale,
    materials: p.materials,
    storyText: p.storyText,
    photoUrl: photoUrls[0] ?? null,
    photoUrls,
    artisan: {
      id: p.artisan.id,
      fullName: p.artisan.fullName,
      region: p.artisan.region,
      state: p.artisan.state,
    },
  };
}
