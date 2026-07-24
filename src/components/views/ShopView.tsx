"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import type { ShopCard } from "@/lib/shop";
import { IconBag, IconShield } from "@/components/icons";

export function ShopView({ products }: { products: ShopCard[] }) {
  const t = useT();

  return (
    <div>
      <SectionHeading label={t("nav.shop")} sub={t("shop.intro")}>
        {t("shop.title")}
      </SectionHeading>

      {products.length === 0 ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-card">
          <IconBag width={40} height={40} className="mx-auto text-muted" />
          <p className="mt-3 text-base text-muted">{t("shop.empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-card">
              <Link href={`/shop/${p.id}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl ?? "/samples/hero.png"}
                  alt={p.title}
                  className="aspect-[4/3] w-full object-cover"
                  width={480}
                  height={360}
                />
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <Link href={`/shop/${p.id}`}>
                  <h2 className="font-bold hover:text-indigo">{p.title}</h2>
                </Link>
                <p className="text-sm text-muted">
                  {p.artisan.fullName} · {p.artisan.region}, {p.artisan.state}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                  <IconShield width={13} height={13} /> {t("shop.verified")}
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-xl font-extrabold">{formatINR(p.pricePaise)}</span>
                  {p.stock <= 3 ? (
                    <span className="text-xs font-semibold text-terracotta">
                      {t("shop.lowStock", { n: String(p.stock) })}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  <AddToCartButton productId={p.id} full />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
