"use client";

import { useT } from "@/lib/i18n/provider";
import { IconShield, IconUser, IconClock, IconCheck, IconThread } from "./icons";

export type Tier =
  | "SELF_DECLARED"
  | "DOCS_PENDING"
  | "ID_VERIFIED"
  | "GI_AUTHORISED"
  | "COOP_VOUCHED";

// Status is NEVER conveyed by colour alone — every badge carries an icon + text.
const style: Record<Tier, { cls: string; Icon: typeof IconShield }> = {
  SELF_DECLARED: { cls: "bg-muted/10 text-muted border-muted/30", Icon: IconUser },
  DOCS_PENDING: { cls: "bg-haldi/15 text-ink border-haldi/50", Icon: IconClock },
  ID_VERIFIED: { cls: "bg-teal/10 text-teal-700 border-teal/40", Icon: IconShield },
  GI_AUTHORISED: { cls: "bg-indigo/10 text-indigo border-indigo/40", Icon: IconThread },
  COOP_VOUCHED: { cls: "bg-success/10 text-success border-success/40", Icon: IconCheck },
};

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" }) {
  const t = useT();
  const { cls, Icon } = style[tier];
  const pad = size === "sm" ? "px-2.5 py-1 text-sm" : "px-3 py-1.5 text-base";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${cls} ${pad}`}
    >
      <Icon width={size === "sm" ? 16 : 18} height={size === "sm" ? 16 : 18} />
      {t(`tier.${tier}.label`)}
    </span>
  );
}

/** Full plain-language sentence about what the tier means — for profile/verify pages. */
export function TierExplanation({ tier }: { tier: Tier }) {
  const t = useT();
  const { Icon, cls } = style[tier];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${cls}`}>
      <Icon width={22} height={22} className="mt-0.5 shrink-0" />
      <p className="text-base leading-snug">{t(`tier.${tier}.plain`)}</p>
    </div>
  );
}
