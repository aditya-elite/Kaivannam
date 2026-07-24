"use client";

import { useT } from "@/lib/i18n/provider";
import { IconUser, IconGlobe } from "@/components/icons";

/**
 * Attestation contact — the channel, not a form.
 *
 * A cooperative or NGO who can vouch for a piece needs a way to reach the maker
 * and arrange it. This simply shows that channel (email / phone). Verification
 * then happens through it, off-platform. There is deliberately no submission
 * flow here — that is what the maker/organisation does directly.
 *
 * If the maker hasn't published a contact, a platform address is shown so the
 * door is never closed.
 */

const PLATFORM_EMAIL = "attest@kaivannam.example";

export function AttestationContact({
  makerName,
  email,
  phone,
}: {
  makerName: string;
  email: string | null;
  phone: string | null;
}) {
  const t = useT();
  const hasMaker = !!(email || phone);

  return (
    <section
      aria-labelledby="attest-contact-heading"
      className="mt-6 rounded-2xl border border-teal/40 bg-surface p-5 shadow-card"
    >
      <p className="type-label flex items-center gap-2 text-teal-700">
        <IconUser width={15} height={15} /> {t("attest.eyebrow")}
      </p>
      <h2 id="attest-contact-heading" className="mt-1 text-lg font-bold text-ink">
        {t("attest.title")}
      </h2>
      <p className="mt-1 text-base text-muted">{t("attest.body", { maker: makerName })}</p>

      <dl className="mt-4 space-y-2">
        {hasMaker ? (
          <>
            {email ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="text-sm font-semibold text-muted">{t("attest.email")}</dt>
                <dd>
                  <a href={`mailto:${email}?subject=${encodeURIComponent(t("attest.mailSubject"))}`} className="product-id font-semibold text-indigo hover:underline">
                    {email}
                  </a>
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="text-sm font-semibold text-muted">{t("attest.phone")}</dt>
                <dd>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="product-id font-semibold text-indigo hover:underline">
                    {phone}
                  </a>
                </dd>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
              <IconGlobe width={14} height={14} /> {t("attest.platform")}
            </dt>
            <dd>
              <a href={`mailto:${PLATFORM_EMAIL}`} className="product-id font-semibold text-indigo hover:underline">
                {PLATFORM_EMAIL}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-sm text-muted">{t("attest.note")}</p>
    </section>
  );
}
