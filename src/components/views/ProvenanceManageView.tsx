"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";
import { SectionHeading, Card } from "@/components/ui";
import type { Provenance } from "@/lib/provenance";
import {
  initiateTransferAction,
  acceptTransferAction,
  resolveTransferAction,
  attestAction,
  correctionAction,
  type ActionState,
} from "@/app/product/[id]/provenance/actions";
import { IconArrowRight, IconUser, IconShield, IconThread, IconClock } from "@/components/icons";

type Viewer = { displayName: string; role: string; isMaker: boolean } | null;

const initial: ActionState = { ok: false, message: "" };

/**
 * The custody + attestation + correction console.
 *
 * Deliberately a separate surface from the buyer-facing verify screen: this is
 * where the two layers are *acted on*, and each action is server-enforced (see
 * ../app/product/[id]/provenance/actions.ts). The forms here are convenience.
 */
export function ProvenanceManageView({
  productId,
  productTitle,
  makerName,
  provenance,
  viewer,
}: {
  productId: string;
  productTitle: string;
  makerName: string;
  provenance: Provenance;
  viewer: Viewer;
}) {
  const t = useT();
  const { authenticity: auth, custody } = provenance;
  const isAdmin = viewer?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/product/${productId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo hover:underline"
      >
        ← {t("prov.backToVerify")}
      </Link>

      <SectionHeading sub={productTitle} label={t("prov.manageEyebrow")}>
        {t("prov.manageTitle")}
      </SectionHeading>

      {/* ── CUSTODY (Layer 2) — transfer + handshake ─────────────────────── */}
      <section aria-labelledby="mc-heading" className="mb-8">
        <h2 id="mc-heading" className="mb-1 flex items-center gap-2 text-xl font-bold">
          <IconUser width={20} height={20} className="text-teal-700" /> {t("prov.custodyTitle")}
        </h2>
        <p className="mb-4 text-base text-muted">{t("prov.custodyStatus")}</p>

        <Card className="border-l-4 border-teal">
          <p className="type-label text-muted">{t("prov.currentOwner")}</p>
          <p className="mt-1 text-lg font-bold">{custody.currentOwner ?? t("prov.unknownOwner")}</p>
          <p className="mt-1 text-sm text-muted">
            {custody.transferCount === 0
              ? t("prov.neverTransferred")
              : t("prov.transferredN", { count: custody.transferCount })}
          </p>
        </Card>

        {/* Pending handshake — accept / decline */}
        {custody.pending ? (
          <PendingHandshake
            productId={productId}
            fromParty={custody.pending.fromParty}
            toParty={custody.pending.toParty}
            note={custody.pending.note}
          />
        ) : (
          <InitiateTransfer productId={productId} currentOwner={custody.currentOwner} viewer={viewer} />
        )}

        {/* Full append-only log */}
        {custody.log.length ? (
          <ol className="mt-6 space-y-3 border-l-2 border-ink/10 pl-4">
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
      </section>

      {/* ── AUTHENTICITY (Layer 1) — attestation + correction ────────────── */}
      <section aria-labelledby="ma-heading">
        <h2 id="ma-heading" className="mb-1 flex items-center gap-2 text-xl font-bold">
          <IconShield width={20} height={20} className="text-teal-700" /> {t("prov.authTitle")}
        </h2>
        <p className="mb-4 text-base text-muted">{t("prov.authManageNote")}</p>

        {auth ? (
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-extrabold">{t(`prov.level.${auth.level}`)}</span>
              <span className="tnum text-base font-semibold text-muted">
                {t("prov.scoreOutOf", { score: auth.trustScore })}
              </span>
            </div>
            {auth.history.length > 1 ? (
              <ol className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm text-muted">
                {auth.history.map((h) => (
                  <li key={h.version} className="flex items-baseline gap-2">
                    <IconThread width={13} height={13} className="mt-1 shrink-0 text-terracotta" />
                    <span>
                      {t("prov.recordVersion", { n: h.version })} · {t("prov.scoreOutOf", { score: h.trustScore })}
                      {h.supersedeReason ? ` · ${t("prov.correctionReason", { reason: h.supersedeReason })}` : ""}{" "}
                      · {formatDate(h.at)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </Card>
        ) : null}

        {/* Attestation — independent parties only. */}
        <AttestForm productId={productId} viewer={viewer} makerName={makerName} />

        {/* Correction — admin only, supersede not edit. */}
        {isAdmin ? <CorrectionForm productId={productId} /> : null}
      </section>
    </div>
  );
}

/* ── sub-forms ─────────────────────────────────────────────────────────────── */

function Feedback({ state }: { state: ActionState }) {
  const t = useT();
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`mt-2 text-sm font-semibold ${state.ok ? "text-success" : "text-warning"}`}
    >
      {t(`prov.msg.${state.message}`)}
    </p>
  );
}

function InitiateTransfer({
  productId,
  currentOwner,
  viewer,
}: {
  productId: string;
  currentOwner: string | null;
  viewer: Viewer;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(initiateTransferAction, initial);
  return (
    <form action={action} className="mt-4 rounded-xl border border-ink/15 p-4">
      <input type="hidden" name="productId" value={productId} />
      <p className="mb-3 text-base font-semibold">{t("prov.initiateTitle")}</p>

      <label className="mb-1 block text-sm font-semibold" htmlFor="tr-actor">
        {t("prov.youAre")}
      </label>
      <input
        id="tr-actor"
        name="actor"
        defaultValue={viewer?.displayName ?? currentOwner ?? ""}
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <label className="mb-1 block text-sm font-semibold" htmlFor="tr-to">
        {t("prov.recipient")}
      </label>
      <input
        id="tr-to"
        name="toParty"
        required
        placeholder={t("prov.recipientPlaceholder")}
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <label className="mb-1 block text-sm font-semibold" htmlFor="tr-note">
        {t("prov.reasonOptional")}
      </label>
      <input
        id="tr-note"
        name="note"
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <button
        type="submit"
        disabled={pending}
        className="press inline-flex min-h-tap items-center gap-2 rounded-xl bg-terracotta px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {t("prov.proposeTransfer")} <IconArrowRight width={18} height={18} />
      </button>
      <p className="mt-2 text-sm text-muted">{t("prov.handshakeNote")}</p>
      <Feedback state={state} />
    </form>
  );
}

function PendingHandshake({
  productId,
  fromParty,
  toParty,
  note,
}: {
  productId: string;
  fromParty: string;
  toParty: string;
  note: string | null;
}) {
  const t = useT();
  const [acc, accAction, accPending] = useActionState(acceptTransferAction, initial);
  const [res, resAction] = useActionState(resolveTransferAction, initial);

  return (
    <div className="mt-4 rounded-xl border-2 border-haldi bg-haldi/10 p-4">
      <p className="flex items-center gap-2 text-base font-semibold">
        <IconClock width={16} height={16} className="text-muted" />
        {t("prov.pendingHeading")}
      </p>
      <p className="mt-1 text-sm text-ink">
        {t("prov.pendingDetail", { from: fromParty, to: toParty })}
        {note ? ` · ${note}` : ""}
      </p>

      {/* Accept — the recipient must confirm their own name. Server re-checks. */}
      <form action={accAction} className="mt-3">
        <input type="hidden" name="productId" value={productId} />
        {/* requestId isn't exposed to the client here; the server resolves the
            single pending request for the product via the accept path. */}
        <input type="hidden" name="requestId" value="" />
        <label className="mb-1 block text-sm font-semibold" htmlFor="ac-actor">
          {t("prov.confirmYouAre", { to: toParty })}
        </label>
        <input
          id="ac-actor"
          name="actor"
          required
          placeholder={toParty}
          className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={accPending}
            className="press inline-flex min-h-tap items-center gap-2 rounded-xl bg-teal px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {t("prov.accept")}
          </button>
        </div>
        <Feedback state={acc} />
      </form>

      {/* Decline */}
      <form action={resAction} className="mt-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="requestId" value="" />
        <input type="hidden" name="outcome" value="DECLINED" />
        <button
          type="submit"
          className="press inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-ink/20 px-5 py-3 font-semibold text-ink"
        >
          {t("prov.decline")}
        </button>
        <Feedback state={res} />
      </form>
    </div>
  );
}

function AttestForm({
  productId,
  viewer,
  makerName,
}: {
  productId: string;
  viewer: Viewer;
  makerName: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(attestAction, initial);

  if (!viewer) {
    return (
      <p className="rounded-xl border border-ink/15 p-4 text-sm text-muted">
        {t("prov.attestSignIn")}{" "}
        <Link href="/login" className="font-semibold text-indigo hover:underline">
          {t("nav.signin")}
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-ink/15 p-4">
      <input type="hidden" name="productId" value={productId} />
      <p className="mb-1 text-base font-semibold">{t("prov.attestTitle")}</p>
      <p className="mb-3 text-sm text-muted">{t("prov.attestNote")}</p>

      <label className="mb-1 block text-sm font-semibold" htmlFor="at-type">
        {t("prov.attesterKind")}
      </label>
      <select
        id="at-type"
        name="attesterType"
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      >
        <option value="COOPERATIVE">{t("prov.source.cooperative")}</option>
        <option value="NGO">{t("prov.source.ngo")}</option>
      </select>

      <label className="mb-1 block text-sm font-semibold" htmlFor="at-name">
        {t("prov.attesterName")}
      </label>
      <input
        id="at-name"
        name="attesterName"
        required
        placeholder={t("prov.attesterNamePlaceholder")}
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <label className="mb-1 block text-sm font-semibold" htmlFor="at-stmt">
        {t("prov.attesterStatement")}
      </label>
      <input
        id="at-stmt"
        name="statement"
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" name="witnessed" className="h-5 w-5" />
        {t("prov.witnessed")}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="press inline-flex min-h-tap items-center gap-2 rounded-xl bg-indigo px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {t("prov.recordAttestation")}
      </button>
      <p className="mt-2 text-sm text-muted">{t("prov.independenceNote", { maker: makerName })}</p>
      <Feedback state={state} />
    </form>
  );
}

function CorrectionForm({ productId }: { productId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(correctionAction, initial);
  return (
    <form action={action} className="mt-4 rounded-xl border-2 border-dashed border-warning/40 p-4">
      <input type="hidden" name="productId" value={productId} />
      <p className="mb-1 text-base font-semibold">{t("prov.correctionTitle")}</p>
      <p className="mb-3 text-sm text-muted">{t("prov.correctionNote")}</p>

      <label className="mb-1 block text-sm font-semibold" htmlFor="co-field">
        {t("prov.correctionField")}
      </label>
      <select
        id="co-field"
        name="field"
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      >
        <option value="materials">{t("verify.materials")}</option>
        <option value="title">{t("prov.fieldTitle")}</option>
        <option value="artisanName">{t("prov.fieldArtisan")}</option>
      </select>

      <label className="mb-1 block text-sm font-semibold" htmlFor="co-value">
        {t("prov.correctedValue")}
      </label>
      <input
        id="co-value"
        name="value"
        required
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <label className="mb-1 block text-sm font-semibold" htmlFor="co-reason">
        {t("prov.correctionReasonLabel")}
      </label>
      <input
        id="co-reason"
        name="reason"
        required
        className="mb-3 min-h-tap w-full border-0 border-b-2 border-ink/25 bg-transparent px-1 text-base focus:border-terracotta"
      />

      <button
        type="submit"
        disabled={pending}
        className="press inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-ink/25 px-5 py-3 font-semibold text-ink disabled:opacity-60"
      >
        {t("prov.applyCorrection")}
      </button>
      <p className="mt-2 text-sm text-muted">{t("prov.supersedeNote")}</p>
      <Feedback state={state} />
    </form>
  );
}
