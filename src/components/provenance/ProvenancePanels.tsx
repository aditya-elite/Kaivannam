"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";
import type { Provenance } from "@/lib/provenance";
import type { SourceKey } from "@/lib/consensus/weights";
import { IconShield, IconCheck, IconArrowRight, IconThread, IconClock, IconUser } from "@/components/icons";

/**
 * The two layers, made visually distinct on purpose.
 *
 *   Authenticity — a certificate. Framed, heavy, ink-on-cream, sealed. It reads
 *   as a PERMANENT FACT, because it is one: it was established when the piece
 *   was made and cannot be diluted by anything that happens afterwards.
 *
 *   Custody — a status ticket. Lighter, teal-accented, clearly "current". It
 *   reads as CHANGEABLE, because ownership changes over an item's life. A long
 *   chain here is history, and is styled so it can never look like it weakened
 *   the certificate above.
 *
 * If these two were styled the same, a buyer would read "transferred 6 times"
 * as "proof degraded". The whole design job here is to make that misreading
 * impossible.
 */

const SOURCE_ORDER: SourceKey[] = ["cooperative", "ngo", "timeline", "history", "buyerScans"];

export function ProvenancePanels({
  productId,
  provenance,
}: {
  productId: string;
  provenance: Provenance;
}) {
  const t = useT();
  const { authenticity: auth, custody } = provenance;

  return (
    <div className="mt-8 space-y-6">
      {auth ? <AuthenticityCertificate auth={auth} /> : null}
      <CustodyTicket productId={productId} custody={custody} />
    </div>
  );
}

/* ── LAYER 1: authenticity, styled as a permanent certificate ─────────────── */

function AuthenticityCertificate({ auth }: { auth: NonNullable<Provenance["authenticity"]> }) {
  const t = useT();

  const levelWord = t(`prov.level.${auth.level}`);
  // "Who confirmed this" — name the KINDS of independent parties, in plain words.
  const confirmations: string[] = [];
  if (auth.parties.cooperatives.length)
    confirmations.push(
      auth.parties.cooperatives.length === 1
        ? t("prov.byCoop", { name: auth.parties.cooperatives[0] })
        : t("prov.byCoops", { count: auth.parties.cooperatives.length }),
    );
  if (auth.parties.ngos.length)
    confirmations.push(
      auth.parties.ngos.length === 1
        ? t("prov.byNgo", { name: auth.parties.ngos[0] })
        : t("prov.byNgos", { count: auth.parties.ngos.length }),
    );
  if (auth.parties.hasConsistentHistory) confirmations.push(t("prov.byHistory"));
  if (auth.parties.scanCount > 0)
    confirmations.push(t("prov.byScans", { count: auth.parties.scanCount }));

  const supersedes = auth.history.filter((h) => h.supersedeReason);

  return (
    <section
      aria-labelledby="auth-heading"
      /* PERMANENT styling: a struck-in certificate. Solid ink frame, double
         keyline, warm ground. Deliberately heavy and finished-looking. */
      className="relative overflow-hidden border-2 border-ink bg-cream carved-frame"
    >
      <div className="border-b-2 border-ink/15 bg-ink px-5 py-3 text-cream">
        <p className="type-label flex items-center gap-2 text-haldi">
          <IconShield width={16} height={16} /> {t("prov.authEyebrow")}
        </p>
        <h2 id="auth-heading" className="mt-1 text-xl font-extrabold">
          {t("prov.authTitle")}
        </h2>
      </div>

      <div className="p-5">
        <p className="text-base text-muted">{t("prov.authPermanent")}</p>

        {/* Trust level — plain word first, number second, never colour alone. */}
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-2 text-2xl font-extrabold text-ink">
            <IconCheck width={22} height={22} className="text-teal-700" />
            {levelWord}
          </span>
          <span className="tnum text-base font-semibold text-muted">
            {t("prov.scoreOutOf", { score: auth.trustScore })}
          </span>
        </div>

        {/* Who confirmed it — the whole point: independent agreement, named. */}
        <div className="mt-4 border-l-2 border-teal py-1 pl-4">
          <p className="type-label text-muted">{t("prov.confirmedBy")}</p>
          <p className="mt-1 text-base text-ink">
            {confirmations.length ? joinPlain(confirmations, t) : t("prov.noneYet")}
          </p>
        </div>

        {/* The five weighted inputs, each a different amount. Value shown as
            text (n/weight), not by bar length alone. */}
        <ul className="mt-5 space-y-3">
          {SOURCE_ORDER.map((key) => {
            const src = auth.sources.find((s) => s.key === key);
            if (!src) return null;
            const pct = Math.round((src.signal || 0) * 100);
            return (
              <li key={key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold text-ink">{t(`prov.source.${key}`)}</span>
                  <span className="tnum shrink-0 text-sm text-muted">
                    {t("prov.weightLabel", { weight: src.weight })}
                  </span>
                </div>
                <p className="text-sm text-muted">{src.detail}</p>
                {/* Bar is decorative reinforcement; the text above carries it. */}
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
                  role="img"
                  aria-label={t("prov.contributes", { pct })}
                >
                  <div
                    className={`h-full rounded-full ${src.present ? "bg-teal" : "bg-transparent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* The immutable fingerprint + version note. */}
        <div className="mt-5 border-t border-ink/10 pt-3 text-sm text-muted">
          <p>
            {t("prov.fingerprint")}:{" "}
            <span className="product-id font-mono text-ink">{auth.coreHashShort || "—"}…</span>
          </p>
          {auth.version > 0 ? (
            <p className="mt-1">
              {t("prov.recordVersion", { n: auth.version })} · {t("prov.updated", { date: formatDate(auth.lastUpdated) })}
            </p>
          ) : null}
        </div>

        {/* Corrections, if any — supersede audit trail, original stays visible. */}
        {supersedes.length ? (
          <div className="mt-4 border-l-2 border-haldi bg-surface/70 p-3">
            <p className="type-label text-muted">{t("prov.correctionsTitle")}</p>
            <ul className="mt-1 space-y-1">
              {supersedes.map((h) => (
                <li key={h.version} className="text-sm text-ink">
                  {t("prov.correctedOn", { date: formatDate(h.at) })} — {h.supersedeReason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── LAYER 2: custody, styled as a current, changeable status ─────────────── */

function CustodyTicket({
  productId,
  custody,
}: {
  productId: string;
  custody: Provenance["custody"];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="custody-heading"
      /* CHANGEABLE styling: a light status card, dashed accent, teal — a
         "ticket" not a "certificate". Nothing about it reads as permanent. */
      className="rounded-2xl border border-dashed border-teal/60 bg-surface p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="type-label flex items-center gap-2 text-teal-700">
            <IconUser width={15} height={15} /> {t("prov.custodyEyebrow")}
          </p>
          <h2 id="custody-heading" className="mt-1 text-lg font-bold text-ink">
            {t("prov.custodyTitle")}
          </h2>
        </div>
        <span className="rounded-full bg-teal/10 px-3 py-1 text-sm font-semibold text-teal-700">
          {custody.transferCount === 0
            ? t("prov.neverTransferred")
            : t("prov.transferredN", { count: custody.transferCount })}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted">{t("prov.custodyStatus")}</p>

      <div className="mt-4 rounded-xl bg-cream p-4">
        <p className="type-label text-muted">{t("prov.currentOwner")}</p>
        <p className="mt-1 text-lg font-bold text-ink">
          {custody.currentOwner ?? t("prov.unknownOwner")}
        </p>
      </div>

      {custody.pending ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-haldi/15 px-3 py-2 text-sm text-ink">
          <IconClock width={15} height={15} className="shrink-0 text-muted" />
          {t("prov.pendingTo", { to: custody.pending.toParty })}
        </p>
      ) : null}

      {/* History is subordinate — hidden behind a toggle so it never competes
          with the certificate above. */}
      {custody.log.length > 1 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="press inline-flex min-h-tap items-center gap-1 text-sm font-semibold text-indigo"
          >
            {open ? t("prov.hideHistory") : t("prov.showHistory")}
            <IconThread width={14} height={14} />
          </button>
          {open ? (
            <ol className="mt-3 space-y-3 border-l-2 border-ink/10 pl-4">
              {custody.log.map((e) => (
                <li key={e.seq} className="relative">
                  <span className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full bg-teal" />
                  <p className="text-sm font-semibold text-ink">
                    {e.isGenesis
                      ? t("prov.genesisHeld", { by: e.toParty })
                      : t("prov.transferredTo", { from: e.fromParty ?? "—", to: e.toParty })}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(e.at)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {/* The reassurance, stated outright. */}
      <p className="mt-4 text-sm text-muted">{t("prov.notDilution")}</p>

      <Link
        href={`/product/${productId}/provenance`}
        className="press mt-4 inline-flex min-h-tap items-center gap-1 font-semibold text-indigo hover:underline"
      >
        {t("prov.manage")} <IconArrowRight width={16} height={16} />
      </Link>
    </section>
  );
}

/** Join phrases with commas and a final "and", localised. */
function joinPlain(parts: string[], t: ReturnType<typeof useT>): string {
  if (parts.length === 1) return parts[0] + ".";
  if (parts.length === 2) return `${parts[0]} ${t("prov.and")} ${parts[1]}.`;
  return `${parts.slice(0, -1).join(", ")}, ${t("prov.and")} ${parts[parts.length - 1]}.`;
}
