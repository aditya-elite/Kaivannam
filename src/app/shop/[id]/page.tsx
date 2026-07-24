import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopProduct } from "@/lib/shop";
import { ShopProductView } from "@/components/views/ShopProductView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getShopProduct(decodeURIComponent(id).toUpperCase());
  return { title: product ? `${product.title} — Kaivannam` : "Shop — Kaivannam" };
}

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getShopProduct(decodeURIComponent(id).toUpperCase());
  if (!product) notFound();
  return <ShopProductView product={product} />;
}
