"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading, Card } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { setQty, removeFromCart } from "@/lib/client/cart";
import { useCartPreview } from "@/components/shop/useCartPreview";
import { IconBag, IconClose, IconArrowRight, IconAlert } from "@/components/icons";

export function CartView() {
  const t = useT();
  const { lines, subtotalPaise, loading } = useCartPreview();
  const hasUnavailable = lines.some((l) => !l.available || l.quantity < l.requestedQty);

  if (!loading && lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <SectionHeading>{t("cart.title")}</SectionHeading>
        <div className="rounded-2xl bg-surface p-10 text-center shadow-card">
          <IconBag width={40} height={40} className="mx-auto text-muted" />
          <p className="mt-3 text-base text-muted">{t("cart.empty")}</p>
          <Link
            href="/shop"
            className="mt-4 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
          >
            {t("shop.title")} <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeading>{t("cart.title")}</SectionHeading>

      <ul className="space-y-4">
        {lines.map((l) => (
          <li key={l.productId}>
            <Card className={`flex gap-4 ${l.available ? "" : "opacity-70"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.photoUrl ?? "/samples/hero.png"}
                alt={l.title}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                width={80}
                height={80}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/shop/${l.productId}`} className="font-bold hover:text-indigo">
                      {l.title}
                    </Link>
                    <p className="text-sm text-muted">{l.artisanName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(l.productId)}
                    aria-label={t("cart.remove")}
                    className="rounded-lg p-1 text-muted hover:bg-ink/5 hover:text-warning"
                  >
                    <IconClose width={18} height={18} />
                  </button>
                </div>

                {!l.available ? (
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-warning">
                    <IconAlert width={15} height={15} /> {t("cart.unavailable")}
                  </p>
                ) : l.quantity < l.requestedQty ? (
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-warning">
                    <IconAlert width={15} height={15} /> {t("cart.reduced", { n: String(l.quantity) })}
                  </p>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  {l.available ? (
                    <label className="flex items-center gap-2 text-sm">
                      {t("shop.quantity")}
                      <select
                        value={l.quantity}
                        onChange={(e) => setQty(l.productId, Number(e.target.value))}
                        className="min-h-tap rounded-lg border-2 border-ink/15 bg-surface px-2 focus:border-teal"
                      >
                        {Array.from({ length: Math.min(l.stock, 10) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span />
                  )}
                  <span className="font-bold">{formatINR(l.lineTotalPaise)}</span>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold">{t("cart.subtotal")}</span>
          <span className="font-extrabold">{formatINR(subtotalPaise)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{t("cart.shippingNote")}</p>

        {hasUnavailable ? (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm font-semibold text-warning">
            <IconAlert width={16} height={16} /> {t("cart.fixItems")}
          </p>
        ) : null}

        <Link
          href="/checkout"
          aria-disabled={subtotalPaise === 0}
          className={`press mt-4 inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-white ${
            subtotalPaise === 0 ? "pointer-events-none bg-ink/30" : "bg-terracotta hover:bg-terracotta-600"
          }`}
        >
          {t("cart.checkout")} <IconArrowRight width={20} height={20} />
        </Link>
      </Card>
    </div>
  );
}
