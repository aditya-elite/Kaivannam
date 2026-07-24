"use client";

import { useT } from "@/lib/i18n/provider";
import { IconAlert } from "@/components/icons";

/**
 * The marketplace policy, shown at every commerce touch-point: Kaivannam only
 * processes the sale; all sales are final (no returns/exchanges here); the buyer
 * contacts the maker directly for anything about the item.
 */
export function PolicyNote({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <div className={`flex items-start gap-3 rounded-xl bg-haldi/15 p-4 text-sm text-ink ${className}`}>
      <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">{t("policy.title")}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-muted">
          <li>{t("policy.noReturns")}</li>
          <li>{t("policy.processOnly")}</li>
          <li>{t("policy.contactMaker")}</li>
        </ul>
      </div>
    </div>
  );
}
