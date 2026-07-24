"use client";

import { useT } from "@/lib/i18n/provider";
import { Card, SectionHeading, ButtonLink } from "@/components/ui";
import { TierBadge } from "@/components/TierBadge";
import { IconCamera, IconShield, IconQr, IconThread } from "@/components/icons";

export function HowItWorksView() {
  const t = useT();
  const tiers = ["SELF_DECLARED", "DOCS_PENDING", "ID_VERIFIED", "GI_AUTHORISED", "COOP_VOUCHED"] as const;

  return (
    <div className="space-y-10">
      <SectionHeading sub={t("home.heroSub")}>{t("nav.how")}</SectionHeading>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { Icon: IconCamera, title: t("home.step1Title"), body: t("home.step1Body") },
          { Icon: IconShield, title: t("home.step2Title"), body: t("home.step2Body") },
          { Icon: IconQr, title: t("home.step3Title"), body: t("home.step3Body") },
        ].map((s, i) => (
          <Card key={i} className="space-y-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-haldi/20 text-terracotta">
              <s.Icon width={26} height={26} />
            </span>
            <h2 className="text-lg font-bold">{s.title}</h2>
            <p className="text-base text-muted">{s.body}</p>
          </Card>
        ))}
      </div>

      {/* The verification tiers, explained in plain language. */}
      <section aria-labelledby="tiers-heading">
        <h2 id="tiers-heading" className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <IconThread width={24} height={24} className="text-indigo" /> {t("profile.verification")}
        </h2>
        <ul className="space-y-3">
          {tiers.map((tier) => (
            <li key={tier}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <TierBadge tier={tier} />
                <p className="max-w-xl text-base text-muted">{t(`tier.${tier}.plain`)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-indigo px-6 py-10 text-white">
        <h2 className="text-2xl font-bold">{t("home.ctaRegister")}</h2>
        <p className="mt-2 max-w-xl text-lg text-white/90">{t("auth.whyBody")}</p>
        <div className="mt-5">
          <ButtonLink href="/register" variant="primary">
            <IconCamera width={20} height={20} /> {t("home.ctaRegister")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
