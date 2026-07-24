"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Card, Rule } from "@/components/ui";
import { TierBadge, TierExplanation, type Tier } from "@/components/TierBadge";
import { Reveal } from "@/components/craft/Reveal";
import { Seal } from "@/components/craft/Seal";
import { WeaveProgress } from "@/components/craft/WeaveProgress";
import { roughClasses } from "@/lib/rough";
import { formatDate } from "@/lib/format";
import type { VerificationResult } from "@/lib/verify";
import { IconCheck, IconClose, IconClock, IconQr, IconAlert, IconArrowRight } from "@/components/icons";

/**
 * §5 — the verification moment. Tier A: hand-composed, and the place the motion
 * budget is spent.
 *
 * Two distinct languages live here on purpose:
 *   Success — seal draws, fills, the mark stamps, four checks land 120ms apart,
 *   and the whole thing STOPS at ~1680ms.
 *   Failure — heavy, slow, all-at-once, with the geometry deliberately softened.
 *   Nothing flashes, shakes or pulses. Someone reading a counterfeit warning
 *   already has a bad outcome; the interface must not add panic to it.
 *
 * In both cases the verdict reaches a screen reader through the live region the
 * instant data arrives, with no dependency on animation timing, and every state
 * is fully legible with CSS and JS disabled.
 */

const CHECK_KEYS = [
  { key: "exists", label: "verify.check.exists" },
  { key: "qrValid", label: "verify.check.qr" },
  { key: "hashMatches", label: "verify.check.hash" },
  { key: "makerChecked", label: "verify.check.artisan" },
] as const;

/** Status is carried by an icon and a word, never by colour alone. */
function CheckRow({
  ok,
  label,
  passedWord,
  failedWord,
  className = "",
  style,
}: {
  ok: boolean;
  label: string;
  passedWord: string;
  failedWord: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <li className={`flex items-center gap-3 py-2.5 ${className}`} style={style}>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
        }`}
      >
        {ok ? (
          <IconCheck width={18} height={18} title={passedWord} />
        ) : (
          <IconClose width={18} height={18} title={failedWord} />
        )}
      </span>
      <span className="text-base">
        {label} —{" "}
        <span className={ok ? "font-semibold text-success" : "font-semibold text-warning"}>
          {ok ? passedWord : failedWord}
        </span>
      </span>
    </li>
  );
}

/**
 * Positive actions on a failed record de-emphasise to outline style and require
 * a second, explicit confirmation. The action hierarchy has to change on this
 * screen, not only the motion.
 */
function ConfirmLink({ href, children, confirm, yes }: { href: string; children: React.ReactNode; confirm: string; yes: string }) {
  const [asked, setAsked] = useState(false);

  if (!asked) {
    return (
      <button
        type="button"
        onClick={() => setAsked(true)}
        className="press inline-flex min-h-tap items-center gap-2 rounded-lg border-2 border-ink/25 bg-transparent px-4 py-2 text-base font-semibold text-ink"
      >
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="text-base text-ink">{confirm}</span>
      <Link
        href={href}
        className="press inline-flex min-h-tap items-center gap-2 rounded-lg border-2 border-ink/25 px-4 py-2 text-base font-semibold text-ink"
      >
        {yes} <IconArrowRight width={16} height={16} />
      </Link>
    </span>
  );
}

export function VerifyView({ id, result }: { id: string; result: VerificationResult }) {
  const t = useT();

  const notFound = !result.found || result.verdict === "NOT_FOUND";
  const tampered = result.verdict === "TAMPERED";
  const alert = notFound || tampered;

  const announcement = notFound
    ? t("verify.announce.notFound")
    : tampered
      ? t("verify.announce.tampered")
      : result.verdict === "AUTHENTIC"
        ? t("verify.announce.authentic")
        : t("verify.announce.caution");

  // The live region is populated from data, on render — never from an animation
  // callback. A screen reader gets the verdict at the same moment the server
  // does, whatever the seal is doing.
  const liveRegion = (
    <p aria-live="polite" className="sr-only">
      {announcement}
    </p>
  );

  if (alert) {
    return (
      <AlertResult
        id={id}
        result={result}
        notFound={notFound}
        liveRegion={liveRegion}
        announcement={announcement}
      />
    );
  }

  return <VerifiedResult id={id} result={result} liveRegion={liveRegion} />;
}

/* ── Success language ─────────────────────────────────────────────────────── */

function VerifiedResult({
  id,
  result,
  liveRegion,
}: {
  id: string;
  result: VerificationResult;
  liveRegion: React.ReactNode;
}) {
  const t = useT();
  const p = result.product!;
  const a = result.artisan!;
  const caution = result.verdict === "AUTHENTIC_UNVERIFIED_MAKER";

  const headline = caution ? t("verify.unverifiedMaker") : t("verify.authentic");
  const sub = caution ? t("tier.SELF_DECLARED.plain") : t("verify.authenticSub");

  const checks = result.checks;
  const stages = result.timeline ?? [];
  // Stable per-instance edge variants so no two neighbouring plates share one.
  const edges = roughClasses(stages.length + 4, 3);

  return (
    <div className="mx-auto max-w-2xl">
      {liveRegion}

      {/* Verdict. Text sits on a calm, uniform ground — no illustration behind
          it — so no contrast is left to chance (§2.5). */}
      <header className="flex flex-col items-center gap-4 py-6 text-center">
        <Seal tone={caution ? "caution" : "authentic"} />
        <div>
          <p className="type-label text-muted">{t("verify.checksTitle")}</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{headline}</h1>
          <p className="mx-auto mt-2 max-w-lg text-base text-muted">{sub}</p>
        </div>
      </header>

      {/* §5.2 — the four checks land 120ms apart. The stagger does real semantic
          work: it makes the system look like it is checking rather than
          asserting. Sequence ends at ~1680ms and nothing runs after it. */}
      <ul className="mx-auto max-w-md">
        {CHECK_KEYS.map((c, i) => (
          <CheckRow
            key={c.key}
            ok={checks[c.key]}
            label={t(c.label)}
            passedWord={t("verify.checkPassed")}
            failedWord={t("verify.checkFailed")}
            className="check-land"
            style={{ "--n": i } as React.CSSProperties}
          />
        ))}
      </ul>

      <Rule className="my-8" />

      <div className="space-y-6">
        <Reveal index={0}>
          <Card className={edges[0]}>
            <h2 className="text-xl font-extrabold">{p.title}</h2>
            <p className="mt-1 text-base text-muted">{p.category}</p>
            <div className="mt-4">
              <h3 className="text-base font-bold">{t("verify.materials")}</h3>
              <p className="text-base text-muted">{p.materials}</p>
            </div>
            {p.storyText ? (
              /* §2.9 deckled edge — the one placement where the handmade-paper
                 metaphor is doing narrative work. Applied more widely it stops
                 being a material and becomes a gimmick, so it lives here and
                 nowhere else. The versal and hanging punctuation are the
                 typographic half of the same idea: this paragraph is set like
                 a page from a book, not like a field in a record. */
              <div className="deckle mt-4 bg-cream p-4">
                <h3 className="text-base font-bold">{t("verify.story")}</h3>
                {/* Versal only — no hang-punct here. ::first-letter already
                    absorbs the opening quote into the drop cap (that is what
                    the spec says it does), so a negative text-indent on the
                    same line would pull the floated capital off the margin
                    instead of the punctuation. The two features are correct
                    separately and wrong together. */}
                <p className="versal mt-1 text-base text-ink">“{p.storyText}”</p>
              </div>
            ) : null}
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card className={edges[1]}>
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
        </Reveal>

        <section aria-labelledby="timeline-heading">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="timeline-heading" className="text-xl font-bold">
              {t("verify.timeline")}
            </h2>
            {/* §6.1 — the documented stages as a weave completing. The count is
                spelled out in text beside it; the graphic never carries it. */}
            <WeaveProgress
              done={stages.length}
              label={`${stages.length}/4`}
            />
          </div>

          <ol className="mt-4 space-y-4">
            {stages.map((s, i) => (
              <Reveal as="li" key={s.stage} index={i}>
                {/* §2.1 — rows alternate their shear so the list never reads as
                    identical stamped units. */}
                <div
                  className={`bg-surface p-4 shadow-card ${i % 2 === 0 ? "row-shear" : "row-shear-alt"}`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-bold">{t(`stage.${s.stage}`)}</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                    {/* §6.2b — stage photographs arrive from the server, so
                        they develop (a veil retracting) rather than settle
                        (a print being placed). Settle is for uploads the
                        artisan just took; using both in one view is noise. */}
                    <span className="photo-develop block aspect-square w-full overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.photoUrls[0]}
                        alt={`${t(`stage.${s.stage}`)} — ${p.title}`}
                        className="h-full w-full object-cover"
                        width={320}
                        height={320}
                      />
                    </span>
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-sm text-muted">
                        <IconClock width={15} height={15} /> {t("stage.capturedAt")}:{" "}
                        {formatDate(s.capturedAt)}
                      </p>
                      {s.note ? <p className="text-base">{s.note}</p> : null}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <details className="rounded-2xl bg-surface p-4 shadow-card">
          <summary className="cursor-pointer text-base font-semibold text-indigo">
            {t("common.technicalDetails")}
          </summary>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("verify.fingerprint")}</dt>
              <dd className="product-id font-mono">{result.contentHashShort}…</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("verify.ledgerSeq")}</dt>
              <dd className="product-id font-mono">#{result.ledgerSeq}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("verify.recordedOn")}</dt>
              <dd>{p.sealedAt ? formatDate(p.sealedAt) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("verify.productNumber")}</dt>
              <dd className="product-id font-mono">{id}</dd>
            </div>
          </dl>
          {result.isTestnet ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-haldi/15 p-3 text-sm text-ink">
              <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
              {t("verify.testnetNote")}
            </p>
          ) : null}
        </details>

        <Link
          href="/lookup"
          className="inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
        >
          <IconQr width={18} height={18} /> {t("verify.checkAnother")}
        </Link>
      </div>
    </div>
  );
}

/* ── Failure language (§5.3) ──────────────────────────────────────────────── */

function AlertResult({
  id,
  result,
  notFound,
  liveRegion,
  announcement,
}: {
  id: string;
  result: VerificationResult;
  notFound: boolean;
  liveRegion: React.ReactNode;
  announcement: string;
}) {
  const t = useT();
  const p = result.product;
  const a = result.artisan;

  const headline = notFound ? t("verify.notFound") : t("verify.tampered");
  const sub = notFound ? t("lookup.notFound") : t("verify.tamperedSub");

  return (
    /* `calm-geometry` strips shear, notches and rough edges from everything
       inside. Angularity that reads as confident on a success state reads as
       hostile on a warning; this is the one screen where the vocabulary
       deliberately softens. Square edges, calm alignment. */
    <div className="calm-geometry mx-auto max-w-2xl">
      {liveRegion}

      <header className="relative py-8">
        {/* The plate fades and settles over 500ms with --ease-heavy — slow in,
            slow out, heavy rather than sudden. It is a background layer, so the
            warning text above it is readable from frame one and never animates. */}
        <span
          aria-hidden="true"
          className="fail-panel absolute inset-0 rounded-lg border-2 border-warning/30 bg-warning/5"
        />
        <div className="relative flex flex-col items-center gap-4 px-5 text-center sm:flex-row sm:text-left">
          <Seal tone="alert" size={104} />
          <div>
            {/* No animation on this text. It must be readable immediately. */}
            <h1 className="text-2xl font-extrabold text-warning sm:text-3xl">{headline}</h1>
            <p className="mt-2 text-base text-ink">{sub}</p>
            <p className="mt-3 font-mono text-sm text-muted">
              {t("verify.productNumber")}: {id}
            </p>
          </div>
        </div>
      </header>

      {/* Checks arrive together. A stagger here would build dread — the wrong
          emotional shape entirely. */}
      {!notFound ? (
        <section className="fail-checks mt-6" aria-labelledby="checks-heading">
          <h2 id="checks-heading" className="text-lg font-bold">
            {t("verify.checksTitle")}
          </h2>
          <ul className="mt-1">
            {CHECK_KEYS.map((c) => (
              <CheckRow
                key={c.key}
                ok={result.checks[c.key]}
                label={t(c.label)}
                passedWord={t("verify.checkPassed")}
                failedWord={t("verify.checkFailed")}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Never strand someone with a warning and no path. Three concrete next
          actions, each one self-contained — no dead links, no dead ends. */}
      <section className="mt-8" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-lg font-bold">
          {t("verify.nextTitle")}
        </h2>
        <div className="mt-3 divide-y divide-ink/10 rounded-lg border-2 border-ink/15 bg-surface">
          <NextStep title={t("verify.next.report")} body={t("verify.next.reportBody")}>
            <ReportAction id={id} summary={announcement} label={t("verify.next.report")} />
          </NextStep>

          <NextStep title={t("verify.next.contact")} body={t("verify.next.contactBody")}>
            {a ? (
              <p className="mt-2 text-base text-ink">
                {a.craft} · {a.region}, {a.state}
              </p>
            ) : null}
          </NextStep>

          <NextStep title={t("verify.next.physical")} body={t("verify.next.physicalBody")}>
            <Link
              href="/how-it-works"
              className="mt-3 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
            >
              {t("nav.how")} <IconArrowRight width={16} height={16} />
            </Link>
          </NextStep>
        </div>
      </section>

      {/* The item's own details stay available but are explicitly framed as an
          unverified claim, and the one action that would treat them as genuine
          is outline-style behind a confirmation. */}
      {p && a ? (
        <section className="mt-8" aria-labelledby="claim-heading">
          <h2 id="claim-heading" className="type-label text-muted">
            {t("verify.unverifiedClaim")}
          </h2>
          <div className="mt-2 rounded-lg border-2 border-ink/15 bg-surface p-5">
            <p className="text-sm text-muted">{t("verify.claimNote")}</p>
            <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
            <p className="text-base text-muted">{p.category}</p>
            <dl className="mt-3 space-y-1 text-base">
              <div className="flex gap-2">
                <dt className="text-muted">{t("verify.materials")}:</dt>
                <dd>{p.materials}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">{t("verify.madeBy")}:</dt>
                <dd>{a.fullName}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <ConfirmLink
                href={`/artisans/${a.id}`}
                confirm={t("verify.confirmBody")}
                yes={t("verify.confirmYes")}
              >
                {t("verify.viewMaker")}
              </ConfirmLink>
            </div>
          </div>
        </section>
      ) : null}

      <Link
        href="/lookup"
        className="mt-8 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
      >
        <IconQr width={18} height={18} /> {t("verify.checkAnother")}
      </Link>
    </div>
  );
}

/**
 * Reporting has to work on a phone with no mail client configured, so the
 * fallback is always available: the product number and verdict, copyable in one
 * tap. The mail link only appears when a reporting address is actually
 * configured (NEXT_PUBLIC_REPORT_EMAIL) — a dead mailto: is worse than none.
 */
const REPORT_EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL;

function ReportAction({ id, summary, label }: { id: string; summary: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const text = `${id}\n${summary}`;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
        className="press inline-flex min-h-tap items-center gap-2 rounded-lg bg-warning px-4 py-2 text-base font-semibold text-white"
      >
        {label}
      </button>
      {REPORT_EMAIL ? (
        <a
          href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(
            `Kaivannam report: ${id}`,
          )}&body=${encodeURIComponent(text)}`}
          className="inline-flex min-h-tap items-center font-semibold text-indigo hover:underline"
        >
          {REPORT_EMAIL}
        </a>
      ) : null}
      {/* Confirmation is text in a live region, not a colour change or a flash. */}
      <span aria-live="polite" className="text-sm text-muted">
        {copied ? t("common.saved") : ""}
      </span>
    </div>
  );
}

function NextStep({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 text-base text-muted">{body}</p>
      {children}
    </div>
  );
}
