import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/cart/preview — resolve client cart lines (ids + qty) into
 * server-authoritative line items with current prices, titles and availability.
 * The client never sets prices; this is the single source of truth for totals.
 */
type Body = { items?: { productId: string; quantity: number }[] };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const items = (body.items ?? []).filter((i) => i?.productId && i.quantity > 0);

  const ids = [...new Set(items.map((i) => i.productId))];
  const products = ids.length
    ? await db.product.findMany({
        where: { id: { in: ids } },
        include: { artisan: true, stages: { orderBy: { capturedAt: "asc" }, take: 1 } },
      })
    : [];

  const lines = items.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    const shoppable =
      !!p && p.status === "SEALED" && p.listedForSale && p.stock > 0 && p.priceInPaise != null;
    let photoUrl: string | null = null;
    if (p?.stages[0]) {
      try {
        photoUrl = (JSON.parse(p.stages[0].photoUrls) as string[])[0] ?? null;
      } catch {
        photoUrl = null;
      }
    }
    const quantity = Math.min(i.quantity, p?.stock ?? 0);
    return {
      productId: i.productId,
      requestedQty: i.quantity,
      quantity,
      available: shoppable && quantity > 0,
      title: p?.title ?? "Unavailable item",
      artisanId: p?.artisan.id ?? null,
      artisanName: p?.artisan.fullName ?? "",
      pricePaise: p?.priceInPaise ?? 0,
      stock: p?.stock ?? 0,
      photoUrl,
      lineTotalPaise: (p?.priceInPaise ?? 0) * quantity,
    };
  });

  const subtotalPaise = lines
    .filter((l) => l.available)
    .reduce((sum, l) => sum + l.lineTotalPaise, 0);

  return NextResponse.json({ lines, subtotalPaise });
}
