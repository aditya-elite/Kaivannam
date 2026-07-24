"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rupeesToPaise } from "@/lib/money";

/**
 * Update a product's storefront listing (price / stock / listed). Only the owning
 * artisan may edit their own item. Used from "My items".
 */
export async function updateListing(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.artisanId) return;

  const productId = String(formData.get("productId") ?? "");
  const listed = formData.get("listForSale") === "on";
  const priceInPaise = rupeesToPaise(String(formData.get("price") ?? ""));
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? "0")) || 0);

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.artisanId !== user.artisanId) return;

  // Only list when there is a valid price and stock; otherwise force unlisted.
  const canList = listed && priceInPaise != null && priceInPaise > 0 && stock > 0;

  await db.product.update({
    where: { id: productId },
    data: {
      priceInPaise: priceInPaise ?? product.priceInPaise,
      stock,
      listedForSale: canList,
    },
  });
  revalidatePath("/my-items");
  revalidatePath("/collection");
}
