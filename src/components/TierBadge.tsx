"use client";

import { useT } from "@/lib/i18n/provider";
import { IconShield, IconUser, IconClock, IconCheck, IconThread } from "./icons";

export type Tier =
  | "SELF_DECLARED"
  | "DOCS_PENDING"
  | "ID_VERIFIED"
  | "GI_AUTHORISED"
  | "COOP_VOUCHED";

/**
 * Verification tier is the most consequential fact on an artisan profile — it
 * is the difference between "checked against a register" and "typed in by
 * whoever made the account". It was rendered as a rounded chip, which is the
 * visual weight a framework gives to a tag, not to a credential.
 *
 * So: a struck seal. The wobbled disc path is the same one used by
 * craft/Seal.tsx on the verification screen, so a badge and a verification
 * result never look like they came from two different systems.
 *
 * Two things held from the old implementation, deliberately:
 *   · Status is never carried by colour alone — every tier keeps its icon and
 *     its text label.
 *   · Unverified is a *broken* seal outline, not a red warning. "Nobody has
 *     checked this yet" is a statement about the record, not an accusation
 *     against the artisan, and the visual language has to say so.
 */

// Wobbled disc — hand-struck, not a perfect circle. Shared with Seal.tsx.
const DISC =
  "M22,2 C31,2 42,10 42.5,22 C43,34 32,41.5 22,42 " +
  "C12,42.5 2,34 1.6,22 C1.2,10 13,2 22,2 Z";
// Inner keyline, offset unevenly so it reads as pressed rather than printed.
const KEYLINE =
  "M22,7 C29,7 37,13 37.4,22 C37.8,31 29,36.6 22,37 " +
  "C15,37.4 7,31 6.7,22 C6.4,13 15,7 22,7 Z";

type Look = {
  /** Filled wax, or an open/broken impression. */
  struck: boolean;
  /** Seal body colour. Semantic — never subject to dye-lot drift. */
  fill: string;
  /** Text colour for the label beside the seal. */
  text: string;
  Icon: typeof IconShield;
};

const look: Record<Tier, Look> = {
  SELF_DECLARED: { struck: false, fill: "#6B5546", text: "text-muted", Icon: IconUser },
  DOCS_PENDING: { struck: false, fill: "#E9A319", text: "text-ink", Icon: IconClock },
  ID_VERIFIED: { struck: true, fill: "#1F6F78", text: "text-teal-700", Icon: IconShield },
  GI_AUTHORISED: { struck: true, fill: "#2E3192", text: "text-indigo", Icon: IconThread },
  COOP_VOUCHED: { struck: true, fill: "#2E7D4F", text: "text-success", Icon: IconCheck },
};

function Seal({ tier, size }: { tier: Tier; size: number }) {
  const { struck, fill } = look[tier];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      {struck ? (
        <>
          <path d={DISC} fill={fill} />
          <path d={KEYLINE} fill="none" stroke="rgba(253,248,240,0.45)" strokeWidth="1.2" />
        </>
      ) : (
        /* Not yet struck: an open impression waiting to be filled. The dash is
           what carries "incomplete" without reaching for a warning colour. */
        <path d={DISC} fill="none" stroke={fill} strokeWidth="2.4" strokeDasharray="5 4" />
      )}
    </svg>
  );
}

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" }) {
  const t = useT();
  const { text, struck, Icon } = look[tier];
  const px = size === "sm" ? 26 : 34;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex" style={{ width: px, height: px }}>
        <Seal tier={tier} size={px} />
        {/* The icon sits inside the seal in BOTH states — status is never
            carried by colour alone, and an empty dashed ring also just reads
            as unfinished. On a struck seal it is knocked out of the wax in
            cream; on an open impression it takes the seal's own colour. */}
        <Icon
          width={px * 0.5}
          height={px * 0.5}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            struck ? "text-cream" : text
          }`}
        />
      </span>
      <span className={`font-semibold ${text} ${size === "sm" ? "text-sm" : "text-base"}`}>
        {t(`tier.${tier}.label`)}
      </span>
    </span>
  );
}

/** Full plain-language sentence about what the tier means — for profile/verify pages. */
export function TierExplanation({ tier }: { tier: Tier }) {
  const t = useT();
  const { text, struck, Icon } = look[tier];
  return (
    <div className="flex items-start gap-3 border-l-2 border-ink/15 py-2 pl-4">
      <span className="relative inline-flex shrink-0" style={{ width: 38, height: 38 }}>
        <Seal tier={tier} size={38} />
        <Icon
          width={19}
          height={19}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            struck ? "text-cream" : text
          }`}
        />
      </span>
      <div>
        <p className={`font-semibold ${text}`}>{t(`tier.${tier}.label`)}</p>
        <p className="text-base leading-snug text-ink">{t(`tier.${tier}.plain`)}</p>
      </div>
    </div>
  );
}
