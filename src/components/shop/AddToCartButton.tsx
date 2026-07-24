"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { addToCart } from "@/lib/client/cart";
import { IconBag, IconCheck } from "@/components/icons";

/**
 * Add-to-cart control. `buyNow` adds the item then routes straight to checkout.
 * Shared by the shop grid (quantity 1) and the product detail (chosen quantity).
 */
export function AddToCartButton({
  productId,
  quantity = 1,
  buyNow = false,
  className = "",
  full = false,
}: {
  productId: string;
  quantity?: number;
  buyNow?: boolean;
  className?: string;
  full?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function onClick() {
    addToCart(productId, quantity);
    if (buyNow) {
      router.push("/checkout");
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  const label = buyNow ? t("shop.buyNow") : added ? t("cart.added") : t("shop.addToCart");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={`press inline-flex min-h-tap items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold shadow-card transition-colors ${
        buyNow
          ? "bg-terracotta text-white hover:bg-terracotta-600"
          : "border-2 border-terracotta bg-surface text-terracotta hover:bg-terracotta/5"
      } ${full ? "w-full" : ""} ${className}`}
    >
      {added && !buyNow ? <IconCheck width={20} height={20} /> : <IconBag width={20} height={20} />}
      {label}
    </button>
  );
}
