"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Card } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { PolicyNote } from "@/components/shop/PolicyNote";
import type { ShopDetail } from "@/lib/shop";
import { IconShield, IconArrowRight, IconArrowLeft } from "@/components/icons";

export function ShopProductView({ product }: { product: ShopDetail }) {
  const t = useT();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const max = Math.min(product.stock, 10);
  const photos = product.photoUrls.length ? product.photoUrls : ["/samples/hero.svg"];

  return (
    <div className="mx-auto max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-base">
        <Link href="/shop" className="inline-flex items-center gap-1 text-indigo hover:underline">
          <IconArrowLeft width={16} height={16} /> {t("shop.title")}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[active]}
            alt={product.title}
            className="aspect-square w-full rounded-2xl object-cover shadow-card"
            width={640}
            height={640}
          />
          {photos.length > 1 ? (
            <div className="mt-3 flex gap-2">
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === active ? "border-terracotta" : "border-ink/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Buy panel */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{product.title}</h1>
            <p className="mt-1 text-base text-muted">{product.category}</p>
          </div>

          <p className="text-3xl font-extrabold">{formatINR(product.pricePaise)}</p>

          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
            <IconShield width={16} height={16} /> {t("shop.verified")} ·{" "}
            <Link href={`/product/${product.id}`} className="underline">
              {t("shop.viewRecord")}
            </Link>
          </p>

          <div className="text-base">
            <span className="font-semibold">{t("verify.madeBy")}: </span>
            <Link href={`/artisans/${product.artisan.id}`} className="text-indigo hover:underline">
              {product.artisan.fullName}
            </Link>
            <span className="text-muted">
              {" "}
              · {product.artisan.region}, {product.artisan.state}
            </span>
          </div>

          {/* Quantity + actions */}
          <div className="flex items-center gap-3">
            <label htmlFor="qty" className="text-base font-semibold">
              {t("shop.quantity")}
            </label>
            <select
              id="qty"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="min-h-tap rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
            >
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted">{t("shop.inStock", { n: String(product.stock) })}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <AddToCartButton productId={product.id} quantity={qty} />
            <AddToCartButton productId={product.id} quantity={qty} buyNow />
          </div>

          <Card className="space-y-3">
            <div>
              <h2 className="text-base font-bold">{t("verify.materials")}</h2>
              <p className="text-base text-muted">{product.materials}</p>
            </div>
            {product.storyText ? (
              <div>
                <h2 className="text-base font-bold">{t("verify.story")}</h2>
                <p className="text-base text-muted">“{product.storyText}”</p>
              </div>
            ) : null}
          </Card>

          <PolicyNote />
        </div>
      </div>
    </div>
  );
}
