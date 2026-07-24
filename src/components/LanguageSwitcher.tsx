"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALES, type LocaleCode } from "@/lib/i18n/config";
import { TornHighlight } from "./craft/TornHighlight";
import { IconGlobe, IconCheck } from "./icons";

/**
 * Language switcher. Only `ready` locales appear. Names are shown in their own
 * script; NO country flags are ever used to represent a language.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ready = LOCALES.filter((l) => l.ready);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = ready.find((l) => l.code === locale) ?? ready[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-ink/15 bg-surface px-3 py-2 text-base font-semibold text-ink hover:border-ink/30"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
      >
        <IconGlobe width={20} height={20} />
        <span className={current.fontClass}>{current.nativeName}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-lift"
        >
          {ready.map((l, i) => {
            const active = l.code === locale;
            return (
              <li key={l.code} role="option" aria-selected={active} className="relative">
                {/* §7.2 — the selected row is a torn paint stroke, not a tinted
                    rectangle. Behind the text, so contrast is measured against
                    the stroke; aria-selected above carries the actual state. */}
                {active ? <TornHighlight index={i} /> : null}
                <button
                  type="button"
                  onClick={() => setLocale(l.code as LocaleCode)}
                  className={`relative z-10 flex min-h-tap w-full items-center justify-between gap-2 px-4 py-3 text-left text-base hover:bg-cream/60 ${
                    active ? "font-bold text-ink" : "text-ink"
                  }`}
                  lang={l.code}
                >
                  <span className={l.fontClass}>{l.nativeName}</span>
                  {active ? <IconCheck width={18} height={18} title="Selected" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
