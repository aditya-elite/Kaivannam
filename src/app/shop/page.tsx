import type { Metadata } from "next";
import { listShopProducts } from "@/lib/shop";
import { ShopView } from "@/components/views/ShopView";

export const metadata: Metadata = { title: "Shop — Kaivannam" };

// Public storefront. No account needed to browse or add to cart.
export default async function ShopPage() {
  const products = await listShopProducts();
  return <ShopView products={products} />;
}
