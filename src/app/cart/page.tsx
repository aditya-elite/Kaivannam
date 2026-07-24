import type { Metadata } from "next";
import { CartView } from "@/components/views/CartView";

export const metadata: Metadata = { title: "Cart — Kaivannam" };

export default function CartPage() {
  return <CartView />;
}
