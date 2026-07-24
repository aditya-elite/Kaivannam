"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Card, Button } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { PolicyNote } from "@/components/shop/PolicyNote";
import { signUpConsumerAction, type AuthState } from "@/app/login/actions";
import { IconCheck, IconUser, IconArrowRight } from "@/components/icons";

type Item = {
  id: string;
  titleSnapshot: string;
  quantity: number;
  unitPricePaise: number;
  artisanId: string;
  artisanName: string;
  contact: string | null;
};

export type OrderData = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  address: string;
  subtotalPaise: number;
  cardLast4: string | null;
  paymentRef: string | null;
  createdAt: string;
  items: Item[];
};

export function OrderConfirmationView({
  order,
  showRegister,
}: {
  order: OrderData;
  showRegister: boolean;
}) {
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl bg-teal p-6 text-center text-white">
        <IconCheck width={40} height={40} />
        <h1 className="text-2xl font-extrabold">{t("order.thanks")}</h1>
        <p className="text-base opacity-95">{t("order.confirmed")}</p>
        <p className="font-mono text-sm opacity-90">{t("order.number")}: {order.id}</p>
      </div>

      {/* Items + maker contact */}
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t("order.items")}</h2>
        <ul className="divide-y divide-ink/10">
          {order.items.map((it) => (
            <li key={it.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {it.titleSnapshot} <span className="text-muted">× {it.quantity}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {t("order.maker")}:{" "}
                    <Link href={`/artisans/${it.artisanId}`} className="text-indigo hover:underline">
                      {it.artisanName}
                    </Link>
                    {it.contact ? <span className="text-muted"> · {it.contact}</span> : null}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">
                  {formatINR(it.unitPricePaise * it.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-ink/10 pt-3 text-lg">
          <span className="font-semibold">{t("order.paid")}</span>
          <span className="font-extrabold">{formatINR(order.subtotalPaise)}</span>
        </div>
        {order.cardLast4 ? (
          <p className="text-sm text-muted">
            {t("order.card")} •••• {order.cardLast4} · {t("order.ref")}: {order.paymentRef}
          </p>
        ) : null}
      </Card>

      {/* Delivery */}
      <Card className="mt-4">
        <h2 className="text-lg font-bold">{t("checkout.delivery")}</h2>
        <p className="mt-1 text-base">{order.buyerName}</p>
        <p className="text-base text-muted whitespace-pre-line">{order.address}</p>
        <p className="text-base text-muted">{order.buyerEmail}</p>
      </Card>

      {/* Maker-contact + no-returns policy */}
      <PolicyNote className="mt-4" />

      {/* Register later */}
      {showRegister ? <RegisterLater order={order} /> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/collection"
          className="press inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-ink/15 px-5 py-3 font-semibold text-indigo"
        >
          {t("order.keepShopping")} <IconArrowRight width={18} height={18} />
        </Link>
      </div>
    </div>
  );
}

function RegisterLater({ order }: { order: OrderData }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUpConsumerAction, {});

  return (
    <Card className="mt-4 border-l-4 border-indigo">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <IconUser width={20} height={20} className="text-indigo" /> {t("order.registerTitle")}
      </h2>
      <p className="mt-1 text-base text-muted">{t("order.registerBody")}</p>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={`/orders/${order.id}`} />
        <input type="hidden" name="handle" value={order.buyerEmail} />
        <input type="hidden" name="displayName" value={order.buyerName} />
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-sm font-semibold">
            {t("checkout.email")}
          </label>
          <input
            id="reg-email"
            value={order.buyerEmail}
            readOnly
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-cream px-3 text-base text-muted"
          />
        </div>
        <div>
          <label htmlFor="reg-pw" className="mb-1 block text-sm font-semibold">
            {t("auth.password")}
          </label>
          <input
            id="reg-pw"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
          />
        </div>
        {state.error ? (
          <p role="alert" className="rounded-lg bg-warning/10 p-3 text-sm font-semibold text-warning">
            {t(state.error)}
          </p>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending} className="w-full">
          <IconUser width={18} height={18} />
          {pending ? t("common.loading") : t("order.registerCta")}
        </Button>
      </form>
    </Card>
  );
}
