"use client";

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

  // The two objects are served by auth-gated, same-origin streaming routes;
  // cookie auth applies when opened in a new tab, so no token dance is needed.
  function view() {
    window.open(`/api/id-document/${requestId}/certificate`, "_blank", "noopener");
    window.open(`/api/id-document/${requestId}/image`, "_blank", "noopener");
  }

  return (
    <button
      type="button"
      onClick={view}
      className={`press inline-flex min-h-tap items-center gap-2 rounded-lg border-2 border-ink/20 px-4 py-2.5 text-base font-semibold text-ink hover:border-ink/40 ${className}`}
    >
      <IconShield width={18} height={18} /> {label ?? t("idv.viewCert")}
    </button>
  );
}
