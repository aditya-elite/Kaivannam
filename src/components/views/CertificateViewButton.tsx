"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { IconShield } from "@/components/icons";

/**
 * Opens the private image + signed certificate via short-lived signed URLs,
 * fetched from /api/id-document/[id]/view (which enforces owner-or-admin). Used
 * by the artisan's own card and by the admin review screen.
 */
export function CertificateViewButton({
  requestId,
  label,
  className = "",
}: {
  requestId: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function view() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/id-document/${requestId}/view`);
      if (!res.ok) {
        setMsg(t("idv.msg.viewFailed"));
        return;
      }
      const { imageUrl, certUrl } = (await res.json()) as {
        imageUrl: string | null;
        certUrl: string | null;
      };
      if (certUrl) window.open(certUrl, "_blank", "noopener");
      if (imageUrl) window.open(imageUrl, "_blank", "noopener");
      if (!certUrl && !imageUrl) setMsg(t("idv.msg.viewFailed"));
    } catch {
      setMsg(t("idv.msg.viewFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={view}
        disabled={busy}
        className={`press inline-flex min-h-tap items-center gap-2 rounded-lg border-2 border-ink/20 px-4 py-2.5 text-base font-semibold text-ink hover:border-ink/40 disabled:opacity-60 ${className}`}
      >
        <IconShield width={18} height={18} /> {label ?? t("idv.viewCert")}
      </button>
      {msg ? <span className="text-sm text-warning">{msg}</span> : null}
    </span>
  );
}
