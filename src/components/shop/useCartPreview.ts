"use client";

import { useCallback, useEffect, useState } from "react";
import { getCart, onCartChanged } from "@/lib/client/cart";

/** A server-priced cart line (mirrors /api/cart/preview output). */
export type PreviewLine = {
  productId: string;
  requestedQty: number;
  quantity: number;
  available: boolean;
  title: string;
  artisanId: string | null;
  artisanName: string;
  pricePaise: number;
  stock: number;
  photoUrl: string | null;
  lineTotalPaise: number;
};

export type CartPreview = {
  lines: PreviewLine[];
  subtotalPaise: number;
  loading: boolean;
  refresh: () => void;
};

/**
 * Reads the localStorage cart and resolves it to server-authoritative prices via
 * /api/cart/preview. Re-runs whenever the cart changes.
 */
export function useCartPreview(): CartPreview {
  const [lines, setLines] = useState<PreviewLine[]>([]);
  const [subtotalPaise, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const items = getCart();
    if (items.length === 0) {
      setLines([]);
      setSubtotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cart/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      setLines(data.lines ?? []);
      setSubtotal(data.subtotalPaise ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return onCartChanged(refresh);
  }, [refresh]);

  return { lines, subtotalPaise, loading, refresh };
}
