import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { simulateCharge } from "@/lib/payment";

/**
 * POST /api/orders — checkout. Validates the cart against the DB, runs the
 * SIMULATED payment, and on approval decrements stock + records the order in one
 * transaction. Guest checkout is allowed (buyerUserId is optional).
 */
type Body = {
  items?: { productId: string; quantity: number }[];
  buyer?: {
    name?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  payment?: { cardNumber?: string; expMonth?: string; expYear?: string; cvv?: string };
};

function required(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

export async function POST(req: NextRequest) {
  // An account is required to buy — this is the server-side enforcement.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const items = (body.items ?? []).filter((i) => i?.productId && i.quantity > 0);
  if (items.length === 0) return NextResponse.json({ error: "empty_cart" }, { status: 400 });

  // ── Validate delivery details ──
  const b = body.buyer ?? {};
  const buyerName = required(b.name);
  const buyerEmail = required(b.email);
  const buyerPhone = required(b.phone);
  const addressLine1 = required(b.addressLine1);
  const city = required(b.city);
  const state = required(b.state);
  const postalCode = required(b.postalCode);
  if (!buyerName || !buyerEmail || !buyerPhone || !addressLine1 || !city || !state || !postalCode) {
    return NextResponse.json({ error: "missing_delivery" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(buyerEmail)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  // ── Validate cart against the DB (never trust client prices) ──
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    include: { artisan: true },
  });

  const resolved = items.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    const shoppable =
      !!p && p.status === "SEALED" && p.listedForSale && p.stock > 0 && p.priceInPaise != null;
    return { line: i, product: p, shoppable, inStock: !!p && i.quantity <= p.stock };
  });

  const bad = resolved.filter((r) => !r.shoppable || !r.inStock);
  if (bad.length > 0) {
    return NextResponse.json(
      {
        error: "out_of_stock",
        items: bad.map((r) => ({ productId: r.line.productId, available: r.product?.stock ?? 0 })),
      },
      { status: 409 },
    );
  }

  const subtotalPaise = resolved.reduce(
    (sum, r) => sum + r.product!.priceInPaise! * r.line.quantity,
    0,
  );

  // ── Simulated payment ──
  const pay = body.payment ?? {};
  const charge = simulateCharge({
    cardNumber: pay.cardNumber ?? "",
    expMonth: pay.expMonth ?? "",
    expYear: pay.expYear ?? "",
    cvv: pay.cvv ?? "",
    amountPaise: subtotalPaise,
  });

  const baseOrder = {
    buyerUserId: user?.id ?? null,
    buyerName,
    buyerEmail,
    buyerPhone,
    addressLine1,
    addressLine2: required(b.addressLine2),
    city,
    state,
    postalCode,
    subtotalPaise,
  };

  if (!charge.ok) {
    // Record the failed attempt (no stock change) so the decline is auditable.
    const failed = await db.order.create({
      data: { ...baseOrder, status: "FAILED" },
    });
    return NextResponse.json(
      { error: "payment_declined", reason: charge.decline, orderId: failed.id },
      { status: 402 },
    );
  }

  // ── Approved: decrement stock + create the paid order atomically ──
  try {
    const order = await db.$transaction(async (tx) => {
      // Re-check + decrement stock under the transaction to avoid oversell.
      for (const r of resolved) {
        const fresh = await tx.product.findUnique({ where: { id: r.product!.id } });
        if (!fresh || fresh.stock < r.line.quantity) {
          throw new Error("oversold");
        }
        await tx.product.update({
          where: { id: r.product!.id },
          data: { stock: { decrement: r.line.quantity } },
        });
      }
      return tx.order.create({
        data: {
          ...baseOrder,
          status: "PAID",
          paymentRef: charge.ref,
          cardLast4: charge.last4,
          items: {
            create: resolved.map((r) => ({
              productId: r.product!.id,
              titleSnapshot: r.product!.title,
              artisanId: r.product!.artisan.id,
              artisanNameSnapshot: r.product!.artisan.fullName,
              unitPricePaise: r.product!.priceInPaise!,
              quantity: r.line.quantity,
            })),
          },
        },
      });
    });
    return NextResponse.json({ orderId: order.id });
  } catch {
    return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
  }
}
