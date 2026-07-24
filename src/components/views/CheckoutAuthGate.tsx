"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { SectionHeading, Card } from "@/components/ui";
import { IconUser, IconArrowRight, IconBag } from "@/components/icons";

/**
 * Buying requires an account. Shown at checkout when no one is signed in — both
 * paths (sign in / create a shopper account) return to /checkout, so the cart is
 * preserved and the purchase resumes right where it left off.
 */
export function CheckoutAuthGate() {
  const t = useT();
  const next = encodeURIComponent("/checkout");

  return (
    <div className="mx-auto max-w-md">
      <SectionHeading>{t("checkout.title")}</SectionHeading>

      <Card className="space-y-5 border-l-4 border-teal">
        <div className="flex items-start gap-3">
          <IconBag width={26} height={26} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <h2 className="text-lg font-bold">{t("checkout.authTitle")}</h2>
            <p className="mt-1 text-base text-muted">{t("checkout.authBody")}</p>
          </div>
        </div>

        <Link
          href={`/login?mode=signup&type=shopper&next=${next}`}
          className="press inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-base font-semibold text-white hover:bg-terracotta-600"
        >
          <IconUser width={20} height={20} /> {t("checkout.createAccount")}
        </Link>

        <p className="text-center text-base text-muted">
          {t("checkout.haveAccount")}{" "}
          <Link href={`/login?next=${next}`} className="font-semibold text-indigo hover:underline">
            {t("nav.signin")} <IconArrowRight width={14} height={14} className="inline" />
          </Link>
        </p>
      </Card>
    </div>
  );
}
