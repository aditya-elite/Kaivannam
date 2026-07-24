"use client";

import { useT } from "@/lib/i18n/provider";
import { ButtonLink } from "@/components/ui";
import { Spine } from "@/components/craft/Spine";
import { IconQr, IconShield, IconThread } from "@/components/icons";

/**
 * The shopfront — what you see standing in the doorway.
 *
 * §2.5 governs the type here. The headline sits on a solid dark-wood gradient,
 * not on an illustration, so the lightest and darkest pixels behind every glyph
 * are known at every viewport width: #3a2413 → #24160c, both well past 12:1
 * against cream. The warm light washes over it are the only things on top and
 * they are ≤22% opacity, which does not move that measurement enough to matter.
 * The moment a photograph goes behind this text, an opaque plate becomes
 * mandatory rather than optional.
 */
export function ShowroomHero({ pieces, makers }: { pieces: number; makers: number }) {
  const t = useT();

  return (
    <section className="spotlight relative overflow-hidden rounded-3xl">
      {/* Dark polished wood, built from gradients. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(93deg, rgba(255,214,150,0.05) 0 2px, transparent 2px 11px)," +
            "repeating-linear-gradient(93deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 27px)," +
            "linear-gradient(152deg, #3a2413 0%, #2c1b0f 55%, #24160c 100%)",
        }}
      />
      {/* Lamp spill from the top-left, and a warm bounce off the floor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 70% at 16% -6%, rgba(255,206,122,0.22) 0%, transparent 64%)," +
            "radial-gradient(80% 40% at 70% 106%, rgba(193,68,14,0.20) 0%, transparent 62%)",
        }}
      />

      {/* Carved moulding, inset from the panel edge. */}
      <div aria-hidden="true" className="carved-frame pointer-events-none absolute inset-3 rounded-2xl" />

      <div className="relative px-6 py-14 sm:px-12 sm:py-20">
        <p className="type-label inline-flex items-center gap-2 text-haldi">
          <IconThread width={16} height={16} /> {t("shop.eyebrow")}
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-cream sm:text-6xl">
          {t("shop.heroTitle")}
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/85">
          {t("shop.heroSub")}
        </p>

        <Spine className="mt-9 space-y-3">
          <ButtonLink href="#collection" variant="primary">
            <IconThread width={20} height={20} /> {t("shop.ctaBrowse")}
          </ButtonLink>
          <ButtonLink
            href="/lookup"
            variant="outline"
            className="border-cream/35 !bg-cream/10 !text-cream hover:!border-cream"
          >
            <IconQr width={20} height={20} /> {t("shop.ctaVerify")}
          </ButtonLink>
        </Spine>

        {/* Scale contrast per §2.6: 13px tracked labels against the display
            type above, with nothing in the middle of the ramp. */}
        <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
          <div>
            <dt className="type-label text-cream/65">{t("shop.statPieces")}</dt>
            <dd className="tnum text-3xl font-extrabold text-cream">{pieces}</dd>
          </div>
          <div>
            <dt className="type-label text-cream/65">{t("shop.statMakers")}</dt>
            <dd className="tnum text-3xl font-extrabold text-cream">{makers}</dd>
          </div>
          <div>
            <dt className="type-label text-cream/65">{t("shop.statLedger")}</dt>
            <dd className="inline-flex items-center gap-2">
              <IconShield width={22} height={22} className="text-haldi" aria-hidden="true" />
              <span className="text-lg font-bold text-cream/90">{t("shop.statLedgerValue")}</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
