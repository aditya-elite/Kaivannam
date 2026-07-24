"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Button, Card, SectionHeading } from "@/components/ui";
import { ProgressSteps } from "@/components/form/ProgressSteps";
import { TextField, TextAreaField } from "@/components/form/fields";
import { PhotoCapture } from "@/components/form/PhotoCapture";
import { compressImage } from "@/lib/client/image";
import { Charkha } from "@/components/craft/Charkha";
import {
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconCloud,
  IconShield,
  IconAlert,
} from "@/components/icons";
import {
  type Draft,
  type StageKey,
  STAGE_KEYS,
  newDraft,
  loadDraft,
  saveDraft,
  stagesDone,
} from "@/lib/client/draft";

const CRAFTS = [
  "Kanchipuram silk weaving",
  "Dokra metal art",
  "Terracotta pottery",
  "Blue pottery",
  "Kalamkari",
  "Madhubani painting",
  "Pattachitra",
  "Bidriware",
];

const CURRENT_KEY = "ks_current_draft";
const PENDING_SEAL_KEY = "ks_pending_seal";

export function RegisterView({ authed, artisanName }: { authed: boolean; artisanName: string | null }) {
  const t = useT();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [online, setOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [giReading, setGiReading] = useState(false);
  const giInputRef = useRef<HTMLInputElement>(null);
  const firstLoad = useRef(true);

  // Load or create the working draft. Survives the sign-in round-trip because it
  // lives in localStorage, keyed by CURRENT_KEY.
  useEffect(() => {
    const id = localStorage.getItem(CURRENT_KEY);
    const existing = id ? loadDraft(id) : null;
    const d = existing ?? newDraft();
    localStorage.setItem(CURRENT_KEY, d.id);
    setDraft(d);
    // If we just returned from sign-in to finish sealing, jump to review.
    if (authed && localStorage.getItem(PENDING_SEAL_KEY) === d.id) {
      setStep(3);
    }
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [authed]);

  // Continuous autosave — never lose data on navigation or connection drop.
  useEffect(() => {
    if (!draft) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    saveDraft(draft);
    setSaved(true);
    const tmr = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(tmr);
  }, [draft]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const updateStage = useCallback((key: StageKey, patch: Partial<Draft["stages"][StageKey]>) => {
    setDraft((d) =>
      d ? { ...d, stages: { ...d.stages, [key]: { ...d.stages[key], ...patch } } } : d,
    );
  }, []);

  // Gate 2 — read the GI certificate: OCR the image, extract the GI number for
  // the artisan to confirm, and keep a compressed copy in the draft.
  const handleGiCert = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setGiReading(true);
      try {
        let giNumber = "";
        try {
          const { default: Tesseract } = await import("tesseract.js");
          const { data } = await Tesseract.recognize(file, "eng");
          const m = /GI[\s-]?0*\d{1,5}/i.exec(data.text.replace(/\n/g, " "));
          if (m) giNumber = m[0].toUpperCase().replace(/\s+/g, "");
        } catch {
          /* OCR failed — the artisan can type the number */
        }
        const img = await compressImage(file);
        update(giNumber ? { giCertImage: img, giNumber } : { giCertImage: img });
      } finally {
        setGiReading(false);
      }
    },
    [update],
  );

  const seal = useCallback(async () => {
    if (!draft) return;
    // Auth gate: exactly here, and not before.
    if (!authed) {
      saveDraft(draft);
      localStorage.setItem(PENDING_SEAL_KEY, draft.id);
      router.push("/login?next=/register");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/products/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          category: draft.category,
          materials: draft.materials,
          storyText: draft.storyText,
          hiddenSignature: draft.hiddenSignature,
          hiddenSignatureHint: draft.hiddenSignatureHint,
          giNumber: draft.giNumber,
          giCertImage: draft.giCertImage,
          priceRupees: draft.priceRupees,
          stock: draft.stock,
          listForSale: draft.listForSale,
          stages: Object.fromEntries(
            STAGE_KEYS.map((k) => [k, { photos: draft.stages[k].photos, note: draft.stages[k].note }]),
          ),
        }),
      });
      if (res.status === 401) {
        localStorage.setItem(PENDING_SEAL_KEY, draft.id);
        router.push("/login?next=/register");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const map: Record<string, string> = {
          stage_incomplete: "reg.sealBlocked",
          artisan_unverified: "reg.artisanUnverified",
          gi_required: "reg.giRequired",
          gi_unverified: "reg.giUnverified",
          bad_gi_image: "reg.giRequired",
        };
        setSubmitError(map[data.error as string] ?? "auth.error");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      // Clear the finished draft.
      localStorage.removeItem(CURRENT_KEY);
      localStorage.removeItem(PENDING_SEAL_KEY);
      setDoneId(id);
    } catch {
      setSubmitError("reg.offlineQueued");
    } finally {
      setSubmitting(false);
    }
  }, [draft, authed, router]);

  // §8.1 — never a bare spinner, and never a shimmer skeleton. Charkha plus a
  // text label that says what is happening.
  if (!draft) return <Charkha label={t("common.loading")} />;
  if (doneId) return <DoneCard id={doneId} />;

  const stepLabels = [t("reg.step.details"), t("reg.step.story"), t("reg.step.stages"), t("reg.step.review")];
  const done = stagesDone(draft);
  const giValid = draft.giNumber.trim() && draft.giCertImage;
  const detailsValid = draft.title.trim() && draft.category.trim() && giValid;
  const storyValid = draft.materials.trim();
  const allStagesDone = done === 4;
  const listingValid = !draft.listForSale || (Number(draft.priceRupees) > 0 && Number(draft.stock) >= 1);
  const canSeal = detailsValid && storyValid && allStagesDone && listingValid;

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeading>{t("reg.title")}</SectionHeading>

      {/* Save + connectivity status — always explicit. */}
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted" role="status" aria-live="polite">
          {saved ? (
            <>
              <IconCheck width={16} height={16} className="text-success" /> {t("common.saved")}
            </>
          ) : (
            <>
              <IconCloud width={16} height={16} /> {t("reg.draftSaved")}
            </>
          )}
        </span>
        {!online ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-haldi/20 px-3 py-1 font-semibold text-ink">
            <IconAlert width={15} height={15} /> {t("reg.offlineQueued")}
          </span>
        ) : null}
      </div>

      <ProgressSteps
        steps={stepLabels}
        current={step}
        stepLabel={t("reg.step", { n: step + 1, total: 4 })}
      />

      <Card className="space-y-5">
        {step === 0 ? (
          <>
            <TextField
              label={t("reg.itemTitle")}
              value={draft.title}
              onChange={(v) => update({ title: v })}
              placeholder={t("reg.itemTitlePlaceholder")}
              required
              requiredLabel={t("common.required")}
              error={!draft.title.trim() ? null : undefined}
            />
            <div>
              <label htmlFor="reg-cat" className="mb-1 block text-base font-semibold">
                {t("reg.category")}
                <span className="ml-1 font-bold text-warning" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-cat"
                list="craft-list"
                value={draft.category}
                onChange={(e) => update({ category: e.target.value })}
                required
                aria-required
                className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-4 text-base focus:border-teal"
              />
              <datalist id="craft-list">
                {CRAFTS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Gate 2 — GI certificate for THIS product (separate from artisan ID). */}
            <div className="rounded-xl border-2 border-teal/30 bg-teal/5 p-4">
              <p className="flex items-center gap-2 text-base font-bold text-teal-700">
                <IconShield width={18} height={18} /> {t("reg.giTitle")}
              </p>
              <p className="mt-1 text-sm text-muted">{t("reg.giHelp")}</p>
              <input
                ref={giInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleGiCert(e.target.files?.[0] ?? null)}
              />
              {draft.giCertImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.giCertImage}
                  alt={t("reg.giTitle")}
                  className="mt-3 max-h-40 w-full rounded-lg object-contain"
                />
              ) : null}
              <button
                type="button"
                onClick={() => giInputRef.current?.click()}
                disabled={giReading}
                className="press mt-3 inline-flex min-h-tap items-center gap-2 rounded-lg border-2 border-teal/40 bg-surface px-4 py-2 text-base font-semibold text-teal-700 disabled:opacity-60"
              >
                <IconCloud width={18} height={18} />
                {giReading ? t("reg.giReading") : draft.giCertImage ? t("reg.giReplace") : t("reg.giUpload")}
              </button>
              <div className="mt-3">
                <TextField
                  label={t("reg.giNumber")}
                  value={draft.giNumber}
                  onChange={(v) => update({ giNumber: v.toUpperCase() })}
                  placeholder="GI-0146"
                  required
                  requiredLabel={t("common.required")}
                />
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <TextAreaField
              label={t("reg.materials")}
              value={draft.materials}
              onChange={(v) => update({ materials: v })}
              placeholder={t("reg.materialsPlaceholder")}
              required
              requiredLabel={t("common.required")}
              rows={3}
            />
            <TextAreaField
              label={t("reg.story")}
              value={draft.storyText}
              onChange={(v) => update({ storyText: v })}
              placeholder={t("reg.storyPlaceholder")}
              hint={t("common.optional")}
              rows={4}
            />
            <div className="rounded-xl bg-cream p-4">
              <TextField
                label={t("reg.hiddenSig")}
                value={draft.hiddenSignature}
                onChange={(v) => update({ hiddenSignature: v })}
                hint={t("reg.hiddenSigHelp")}
              />
              <div className="mt-3">
                <TextField
                  label={t("reg.hiddenSigHint")}
                  value={draft.hiddenSignatureHint}
                  onChange={(v) => update({ hiddenSignatureHint: v })}
                  hint={t("common.optional")}
                />
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-base text-muted">{t("reg.stagesIntro")}</p>
            <p
              className="rounded-xl bg-indigo/10 px-4 py-3 text-base font-semibold text-indigo"
              role="status"
              aria-live="polite"
            >
              {t("reg.stageProgress", { done, left: 4 - done })}
            </p>
            {STAGE_KEYS.map((key, i) => {
              const s = draft.stages[key];
              const hasPhoto = s.photos.length > 0;
              return (
                <div key={key} className="rounded-2xl border-2 border-ink/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo text-sm text-white">
                        {i + 1}
                      </span>
                      {t(`stage.${key}`)}
                    </h3>
                    {hasPhoto ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                        <IconCheck width={16} height={16} /> {s.photos.length}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-warning">
                        {t("common.required")}
                      </span>
                    )}
                  </div>
                  <PhotoCapture photos={s.photos} onChange={(photos) => updateStage(key, { photos })} />
                  {!hasPhoto ? (
                    <p className="mt-2 text-sm font-semibold text-warning">
                      {t("reg.stagePhotosRequired", { stage: t(`stage.${key}`) })}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <TextField
                      label={t("reg.stageNote")}
                      value={s.note}
                      onChange={(note) => updateStage(key, { note })}
                      hint={t("common.optional")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <ReviewRow label={t("reg.itemTitle")} value={draft.title} />
            <ReviewRow label={t("reg.category")} value={draft.category} />
            <ReviewRow label={t("reg.giNumber")} value={draft.giNumber} />
            <ReviewRow label={t("reg.materials")} value={draft.materials} />
            {draft.storyText ? <ReviewRow label={t("reg.story")} value={draft.storyText} /> : null}
            <div className="rounded-xl bg-cream p-4">
              <p className="mb-2 text-base font-semibold">{t("verify.timeline")}</p>
              <ul className="space-y-1">
                {STAGE_KEYS.map((k) => (
                  <li key={k} className="flex items-center justify-between text-base">
                    <span>{t(`stage.${k}`)}</span>
                    {draft.stages[k].photos.length > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <IconCheck width={16} height={16} /> {draft.stages[k].photos.length}
                      </span>
                    ) : (
                      <span className="font-semibold text-warning">✕</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {draft.hiddenSignature ? (
              <p className="flex items-start gap-2 rounded-xl bg-teal/10 p-3 text-sm text-teal-700">
                <IconShield width={18} height={18} className="mt-0.5 shrink-0" />
                {t("reg.hiddenSigHelp")}
              </p>
            ) : null}

            {/* Optional storefront listing — put the piece up for sale. */}
            <div className="rounded-xl border-2 border-terracotta/30 bg-terracotta/5 p-4">
              <label className="flex items-center gap-2 text-base font-bold text-terracotta">
                <input
                  type="checkbox"
                  checked={draft.listForSale}
                  onChange={(e) => update({ listForSale: e.target.checked })}
                  className="h-4 w-4"
                />
                {t("reg.listForSale")}
              </label>
              <p className="mt-1 text-sm text-muted">{t("reg.listForSaleHelp")}</p>
              {draft.listForSale ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={t("reg.price")}
                    value={draft.priceRupees}
                    onChange={(v) => update({ priceRupees: v.replace(/[^0-9.]/g, "") })}
                    placeholder="2500"
                    required
                    requiredLabel={t("common.required")}
                  />
                  <TextField
                    label={t("reg.stock")}
                    value={draft.stock}
                    onChange={(v) => update({ stock: v.replace(/[^0-9]/g, "") })}
                    placeholder="1"
                    required
                    requiredLabel={t("common.required")}
                  />
                </div>
              ) : null}
            </div>

            {submitError ? (
              <p role="alert" className="rounded-lg bg-warning/10 p-3 text-base font-semibold text-warning">
                {t(submitError)}
              </p>
            ) : null}

            <Button
              onClick={seal}
              disabled={!canSeal || submitting || !online}
              aria-disabled={!canSeal || submitting || !online}
              aria-describedby={!canSeal ? "seal-help" : undefined}
              className="w-full"
            >
              <IconShield width={22} height={22} />
              {submitting ? t("common.loading") : t("reg.sealCta")}
            </Button>
            {!canSeal ? (
              <p id="seal-help" className="text-center text-sm font-semibold text-warning">
                {t("reg.sealBlocked")}
              </p>
            ) : null}
            {!authed ? (
              <p className="text-center text-sm text-muted">{t("auth.returnNote")}</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* Step navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <IconArrowLeft width={20} height={20} /> {t("common.back")}
        </Button>
        {step < 3 ? (
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={(step === 0 && !detailsValid) || (step === 1 && !storyValid)}
          >
            {t("common.next")} <IconArrowRight width={20} height={20} />
          </Button>
        ) : (
          <Link href="/my-items" className="min-h-tap self-center font-semibold text-indigo hover:underline">
            {t("reg.myItems")}
          </Link>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="text-base">{value}</p>
    </div>
  );
}

function DoneCard({ id }: { id: string }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-teal p-6 text-white">
        <IconShield width={36} height={36} />
        <h1 className="text-2xl font-extrabold">{t("reg.done.title")}</h1>
        <p className="text-base opacity-95">{t("reg.done.body")}</p>
      </div>
      <Card className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/products/${id}/qr`}
          alt={`QR tag for product ${id}`}
          className="h-56 w-56 rounded-xl border border-ink/10"
          width={224}
          height={224}
        />
        <p className="font-mono text-lg font-bold tracking-wide">{id}</p>
        <div className="flex w-full flex-col gap-2">
          <a
            href={`/product/${id}/tag`}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-5 py-3 font-semibold text-white hover:bg-terracotta-600"
          >
            {t("reg.done.print")}
          </a>
          <Link
            href={`/product/${id}`}
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 px-5 py-3 font-semibold text-indigo"
          >
            {t("reg.done.view")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
