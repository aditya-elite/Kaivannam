"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Card } from "@/components/ui";
import type { IdDocView } from "@/lib/id-document";
import { CertificateViewButton } from "@/components/views/CertificateViewButton";
import { IconShield, IconCheck, IconClock, IconAlert, IconUpload } from "@/components/icons";

/**
 * Artisan ID-document card (their OWN portal only — never public).
 *
 * Upload → the /api/id-document pipeline hashes, OCRs, signs, stores privately
 * and anchors the hash. This card shows the resulting status and, when reviewed,
 * a "Kaivannam verified" badge + a link to the signed certificate.
 *
 * COPY RULE: never "government-verified". Kaivannam attests it processed and
 * reviewed the document unaltered — not that the ID itself is genuine.
 */

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read_failed"));
    fr.readAsDataURL(file);
  });
}

export function IdVerificationCard({ idDoc }: { idDoc: IdDocView }) {
  const t = useT();
  const [status, setStatus] = useState(idDoc.status);
  const [error, setError] = useState<string | null>(idDoc.error);
  const [idMasked, setIdMasked] = useState(idDoc.idNumberMasked);
  const [requestId, setRequestId] = useState(idDoc.requestId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/id-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 503 && body.error === "storage_not_configured") {
        setMessage(t("idv.msg.storageMissing"));
      } else if (!res.ok) {
        setMessage(t(`idv.err.${body.error ?? "failed"}`));
      } else if (body.status === "rejected") {
        setStatus("REJECTED");
        setError(`${body.reason}: ${body.detail}`);
        setRequestId(body.requestId);
        setMessage(t("idv.msg.rejected"));
      } else {
        setStatus("PENDING");
        setIdMasked(body.idNumber ? maskLocal(body.idNumber) : null);
        setRequestId(body.requestId);
        setError(null);
        setMessage(t("idv.msg.processed"));
      }
    } catch {
      setMessage(t("idv.err.failed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="border-l-4 border-teal">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="type-label flex items-center gap-2 text-teal-700">
            <IconShield width={15} height={15} /> {t("idv.eyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-bold">{t("idv.title")}</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 text-base text-muted">{t("idv.blurb")}</p>

      {/* Status detail */}
      {status === "VERIFIED" || status === "PENDING" ? (
        <dl className="mt-4 space-y-1 rounded-xl bg-cream p-4">
          {idMasked ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="text-sm font-semibold text-muted">{t("idv.idNumber")}</dt>
              <dd className="product-id font-semibold text-ink">{idMasked}</dd>
            </div>
          ) : null}
          {idDoc.anchorSeq ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="text-sm font-semibold text-muted">{t("idv.anchor")}</dt>
              <dd className="product-id text-ink">#{idDoc.anchorSeq}</dd>
            </div>
          ) : null}
          {idDoc.imageHashShort ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="text-sm font-semibold text-muted">{t("idv.fingerprint")}</dt>
              <dd className="product-id font-mono text-ink">{idDoc.imageHashShort}…</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {status === "REJECTED" && error ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-ink">
          <IconAlert width={16} height={16} className="mt-0.5 shrink-0 text-warning" />
          {t("idv.rejectedReason")}: {error}
        </p>
      ) : null}

      {/* Certificate view (owner only — this whole card is owner-only) */}
      {(status === "VERIFIED" || status === "PENDING") && idDoc.hasCertificate && requestId ? (
        <div className="mt-4">
          <CertificateViewButton requestId={requestId} />
        </div>
      ) : null}

      {/* Upload / re-upload */}
      <div className="mt-4 border-t border-ink/10 pt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFile}
          disabled={busy}
          className="sr-only"
          id="idv-file"
        />
        <label
          htmlFor="idv-file"
          className={`press inline-flex min-h-tap cursor-pointer items-center gap-2 rounded-xl bg-indigo px-5 py-3 font-semibold text-white ${
            busy ? "opacity-60" : "hover:bg-indigo-700"
          }`}
        >
          <IconUpload width={18} height={18} />
          {busy ? t("idv.processing") : status === "NONE" ? t("idv.upload") : t("idv.reupload")}
        </label>
        <p className="mt-2 text-sm text-muted">{t("idv.privacyNote")}</p>
        {message ? (
          <p role="status" className="mt-2 text-sm font-semibold text-ink">
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: IdDocView["status"] }) {
  const t = useT();
  if (status === "VERIFIED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">
        <IconCheck width={15} height={15} /> {t("idv.badge.verified")}
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-haldi/20 px-3 py-1 text-sm font-semibold text-ink">
        <IconClock width={15} height={15} /> {t("idv.badge.pending")}
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-sm font-semibold text-warning">
        <IconAlert width={15} height={15} /> {t("idv.badge.rejected")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 text-sm font-semibold text-muted">
      {t("idv.badge.none")}
    </span>
  );
}

/** Local masking mirror of maskPehchan for the just-uploaded number. */
function maskLocal(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return "•••• •••• " + digits.slice(-4);
}
