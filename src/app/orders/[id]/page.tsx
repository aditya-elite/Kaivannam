import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OrderConfirmationView, type OrderData } from "@/components/views/OrderConfirmationView";

export const metadata: Metadata = { title: "Order — Kaivannam" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.status !== "PAID") notFound();

  const user = await getCurrentUser();

  // Resolve each maker's contact handle (their own login handle = phone/email),
  // so the buyer can reach the vendor directly for anything about the item.
  const artisanIds = [...new Set(order.items.map((i) => i.artisanId))];
  const artisans = await db.artisan.findMany({
    where: { id: { in: artisanIds } },
    include: { user: true },
  });
  const contactOf = (artisanId: string) =>
    artisans.find((a) => a.id === artisanId)?.user?.handle ?? null;

  const data: OrderData = {
    id: order.id,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    address: [
      order.addressLine1,
      order.addressLine2,
      `${order.city}, ${order.state} ${order.postalCode}`,
      order.country,
    ]
      .filter(Boolean)
      .join("\n"),
    subtotalPaise: order.subtotalPaise,
    cardLast4: order.cardLast4,
    paymentRef: order.paymentRef,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      titleSnapshot: it.titleSnapshot,
      quantity: it.quantity,
      unitPricePaise: it.unitPricePaise,
      artisanId: it.artisanId,
      artisanName: it.artisanNameSnapshot,
      contact: contactOf(it.artisanId),
    })),
  };

  // Offer "register later" only to genuine guests (order not linked, nobody signed in).
  const showRegister = !order.buyerUserId && !user;

  return <OrderConfirmationView order={data} showRegister={showRegister} />;
}
