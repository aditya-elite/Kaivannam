"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading, Card } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { getCart, clearCart } from "@/lib/client/cart";
import { useCartPreview } from "@/components/shop/useCartPreview";
import { PolicyNote } from "@/components/shop/PolicyNote";
import { TEST_DECLINE_CARD } from "@/lib/payment-constants";
import { IconBag, IconTruck, IconShield, IconArrowRight, IconAlert } from "@/components/icons";

type Buyer = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

export function CheckoutView({ defaultBuyer }: { defaultBuyer: Partial<Buyer> }) {
  const t = useT();
  const router = useRouter();
  const { lines, subtotalPaise, loading } = useCartPreview();

  const [buyer, setBuyer] = useState<Buyer>({
    name: defaultBuyer.name ?? "",
    email: defaultBuyer.email ?? "",
    phone: defaultBuyer.phone ?? "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [card, setCard] = useState({ cardNumber: "", exp: "", cvv: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Buyer) => (v: string) => setBuyer((b) => ({ ...b, [k]: v }));
  const payable = lines.filter((l) => l.available);
  const canPay = payable.length > 0 && subtotalPaise > 0;

  async function submit() {
    setError(null);
    const [mm, yy] = card.exp.split("/").map((s) => s.trim());
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: getCart(),
          buyer: {
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone,
            addressLine1: buyer.addressLine1,
            addressLine2: buyer.addressLine2,
            city: buyer.city,
            state: buyer.state,
            postalCode: buyer.postalCode,
          },
          payment: { cardNumber: card.cardNumber, expMonth: mm, expYear: yy, cvv: card.cvv },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.orderId) {
        clearCart();
        router.push(`/orders/${data.orderId}`);
        return;
      }
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/checkout")}`);
        return;
      }
      const map: Record<string, string> = {
        empty_cart: "cart.empty",
        missing_delivery: "checkout.missingDelivery",
        bad_email: "checkout.badEmail",
        out_of_stock: "checkout.outOfStock",
        payment_declined: "pay.declined",
      };
      setError(map[data.error as string] ?? "checkout.genericError");
    } catch {
      setError("checkout.genericError");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && payable.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <SectionHeading>{t("checkout.title")}</SectionHeading>
        <div className="rounded-2xl bg-surface p-10 text-center shadow-card">
          <IconBag width={40} height={40} className="mx-auto text-muted" />
          <p className="mt-3 text-base text-muted">{t("cart.empty")}</p>
          <Link href="/collection" className="mt-4 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline">
            {t("shop.title")} <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading>{t("checkout.title")}</SectionHeading>

      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Delivery */}
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <IconTruck width={20} height={20} className="text-indigo" /> {t("checkout.delivery")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t("checkout.name")} value={buyer.name} onChange={set("name")} autoComplete="name" required />
              <TextInput label={t("checkout.email")} value={buyer.email} onChange={set("email")} type="email" autoComplete="email" required />
              <TextInput label={t("checkout.phone")} value={buyer.phone} onChange={set("phone")} type="tel" autoComplete="tel" required />
              <TextInput label={t("checkout.postalCode")} value={buyer.postalCode} onChange={set("postalCode")} autoComplete="postal-code" required />
            </div>
            <TextInput label={t("checkout.address1")} value={buyer.addressLine1} onChange={set("addressLine1")} autoComplete="address-line1" required />
            <TextInput label={t("checkout.address2")} value={buyer.addressLine2} onChange={set("addressLine2")} autoComplete="address-line2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t("checkout.city")} value={buyer.city} onChange={set("city")} autoComplete="address-level2" required />
              <TextInput label={t("checkout.state")} value={buyer.state} onChange={set("state")} autoComplete="address-level1" required />
            </div>
          </Card>

          {/* Payment (simulated) */}
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <IconShield width={20} height={20} className="text-teal" /> {t("pay.title")}
            </h2>
            <p className="rounded-lg bg-teal/10 p-3 text-sm text-teal-700">{t("pay.simNote")}</p>
            <TextInput
              label={t("pay.cardNumber")}
              value={card.cardNumber}
              onChange={(v) => setCard((c) => ({ ...c, cardNumber: v }))}
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t("pay.expiry")} value={card.exp} onChange={(v) => setCard((c) => ({ ...c, exp: v }))} placeholder="MM/YY" required />
              <TextInput label={t("pay.cvv")} value={card.cvv} onChange={(v) => setCard((c) => ({ ...c, cvv: v }))} inputMode="numeric" placeholder="123" required />
            </div>
            <p className="text-xs text-muted">{t("pay.declineHint", { card: TEST_DECLINE_CARD })}</p>
          </Card>

          <PolicyNote />
        </div>

        {/* Order summary */}
        <div>
          <Card className="space-y-3 md:sticky md:top-24">
            <h2 className="text-lg font-bold">{t("checkout.summary")}</h2>
            <ul className="space-y-2 text-sm">
              {payable.map((l) => (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {l.title} × {l.quantity}
                  </span>
                  <span className="shrink-0 font-semibold">{formatINR(l.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-ink/10 pt-3 text-lg">
              <span className="font-semibold">{t("cart.subtotal")}</span>
              <span className="font-extrabold">{formatINR(subtotalPaise)}</span>
            </div>

            {error ? (
              <p role="alert" className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm font-semibold text-warning">
                <IconAlert width={16} height={16} /> {t(error)}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canPay}
              className="press inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-base font-semibold text-white hover:bg-terracotta-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("pay.processing") : `${t("pay.pay")} ${formatINR(subtotalPaise)}`}
            </button>
            <p className="text-center text-xs text-muted">{t("checkout.accountNote")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">
        {label}
        {required ? <span className="ml-1 text-warning" aria-hidden="true">*</span> : null}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-required={required}
        className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
        {...props}
      />
    </div>
  );
}
