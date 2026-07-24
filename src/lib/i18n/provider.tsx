"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type LocaleCode } from "./config";
import { makeT, type TFunc } from "./translate";

type I18nContextValue = { locale: LocaleCode; t: TFunc; setLocale: (l: LocaleCode) => void };

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: LocaleCode;
  children: React.ReactNode;
}) {
  const t = useMemo(() => makeT(locale), [locale]);

  // Persist choice in a cookie and reload so server components re-render in the
  // new language. The switcher "actually works" end-to-end (server + client).
  const setLocale = useCallback((l: LocaleCode) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }, []);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) return { locale: DEFAULT_LOCALE, t: makeT(DEFAULT_LOCALE), setLocale: () => {} };
  return ctx;
}

export function useT(): TFunc {
  return useI18n().t;
}
