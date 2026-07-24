"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Card } from "@/components/ui";
import { TierBadge, TierExplanation, type Tier } from "@/components/TierBadge";
import { formatDate } from "@/lib/format";
import type { VerificationResult } from "@/lib/verify";
import {
  IconShield,
  IconAlert,
  IconCheck,
  IconClose,
  IconClock,
  IconQr,
} from "@/components/icons";

const verdictStyle = {
  AUTHENTIC: { cls: "bg-teal text-white", Icon: IconShield },
  AUTHENTIC_UNVERIFIED_MAKER: { cls: "bg-haldi text-ink", Icon: IconClock },
  TAMPERED: { cls: "bg-warning text-white", Icon: IconAlert },
  NOT_FOUND: { cls: "bg-muted text-white", Icon: IconClose },
} as const;

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
        }`}
      >
        {ok ? <IconCheck width={18} height={18} title="Passed" /> : <IconClose width={18} height={18} title="Failed" />}
      </span>
      {/* Never colour-only: the words "Verified"/"Not verified" carry the status too. */}
      <span className="text-base">
        {label} —{" "}
        <span className={ok ? "font-semibold text-success" : "font-semibold text-warning"}>
          {ok ? "✓" : "✕"}
        </span>
      </span>
    </li>
  );
}

export function VerifyView({ id, result }: { id: string; result: VerificationResult }) {
  const t = useT();

  if (!result.found || result.verdict === "NOT_FOUND") {
    const { cls, Icon } = verdictStyle.NOT_FOUND;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className={`flex items-center gap-3 rounded-2xl p-5 ${cls}`}>
          <Icon width={28} height={28} />
          <p className="text-lg font-bold">{t("verify.notFound")}</p>
        </div>
        <Card>
          <p className="text-base text-muted">{t("lookup.notFound")}</p>
          <p className="mt-2 font-mono text-sm text-muted">ID: {id}</p>
          <Link href="/lookup" className="mt-4 inline-flex font-semibold text-indigo hover:underline">
            {t("lookup.title")}
          </Link>
        </Card>
      </div>
    );
  }

  const { cls, Icon } = verdictStyle[result.verdict];
  const headline =
    result.verdict === "AUTHENTIC"
      ? t("verify.authentic")
      : result.verdict === "AUTHENTIC_UNVERIFIED_MAKER"
        ? t("verify.unverifiedMaker")
        : t("verify.tampered");
  const sub =
    result.verdict === "AUTHENTIC"
      ? t("verify.authenticSub")
      : result.verdict === "TAMPERED"
        ? t("verify.tamperedSub")
        : t("tier.SELF_DECLARED.plain");

  const p = result.product!;
  const a = result.artisan!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-2xl p-6 ${cls}`}>
        <div className="flex items-start gap-3">
          <Icon width={32} height={32} className="mt-0.5 shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold">{headline}</h1>
            <p className="mt-1 text-base opacity-95">{sub}</p>
          </div>
        </div>
      </div>

      {/* The four checks */}
      <Card>
        <h2 className="mb-2 text-lg font-bold">{t("nav.lookup")}</h2>
        <ul className="divide-y divide-ink/5">
          <CheckRow ok={result.checks.exists} label={t("verify.check.exists")} />
          <CheckRow ok={result.checks.qrValid} label={t("verify.check.qr")} />
          <CheckRow ok={result.checks.hashMatches} label={t("verify.check.hash")} />
          <CheckRow ok={result.checks.makerChecked} label={t("verify.check.artisan")} />
        </ul>
      </Card>

      {/* Item */}
      <Card>
        <h2 className="text-xl font-extrabold">{p.title}</h2>
        <p className="mt-1 text-base text-muted">{p.category}</p>
        <div className="mt-4">
          <h3 className="text-base font-bold">{t("verify.materials")}</h3>
          <p className="text-base text-muted">{p.materials}</p>
        </div>
        {p.storyText ? (
          <div className="mt-4">
            <h3 className="text-base font-bold">{t("verify.story")}</h3>
            <p className="text-base text-muted">“{p.storyText}”</p>
          </div>
        ) : null}
      </Card>

      {/* Maker */}
      <Card>
        <h2 className="mb-3 text-lg font-bold">{t("verify.madeBy")}</h2>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.photoUrl ?? "/samples/hero.svg"}
            alt={a.fullName}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
            width={64}
            height={64}
          />
          <div className="min-w-0">
            <Link href={`/artisans/${a.id}`} className="text-lg font-bold text-indigo hover:underline">
              {a.fullName}
            </Link>
            <p className="text-base text-muted">
              {a.craft} · {a.region}, {a.state}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <TierBadge tier={a.tier as Tier} />
          <TierExplanation tier={a.tier as Tier} />
        </div>
      </Card>

      {/* Timeline */}
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-4 text-xl font-bold">
          {t("verify.timeline")}
        </h2>
        <ol className="space-y-4">
          {result.timeline!.map((s, i) => (
            <li key={s.stage} className="relative rounded-2xl bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{t(`stage.${s.stage}`)}</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photoUrls[0]}
                  alt={`${t(`stage.${s.stage}`)} — ${p.title}`}
                  className="aspect-square w-full rounded-xl object-cover"
                  width={320}
                  height={320}
                />
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <IconClock width={15} height={15} /> {t("stage.capturedAt")}:{" "}
                    {formatDate(s.capturedAt)}
                  </p>
                  {s.note ? <p className="text-base">{s.note}</p> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Technical details — jargon kept behind an optional disclosure */}
      <details className="rounded-2xl bg-surface p-4 shadow-card">
        <summary className="cursor-pointer text-base font-semibold text-indigo">
          {t("common.technicalDetails")}
        </summary>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("verify.fingerprint")}</dt>
            <dd className="font-mono">{result.contentHashShort}…</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("verify.ledgerSeq")}</dt>
            <dd className="font-mono">#{result.ledgerSeq}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("verify.recordedOn")}</dt>
            <dd>{p.sealedAt ? formatDate(p.sealedAt) : "—"}</dd>
          </div>
        </dl>
        {result.isTestnet ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-haldi/15 p-3 text-sm text-ink">
            <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
            {t("verify.testnetNote")}
          </p>
        ) : null}
      </details>

      <div className="flex flex-wrap gap-3">
        <Link href="/lookup" className="inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline">
          <IconQr width={18} height={18} /> {t("lookup.title")}
        </Link>
      </div>
    </div>
  );
}
