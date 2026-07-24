// Locale registry. Only locales marked `ready` are shown in the switcher —
// a half-translated language must never appear. Names are in their OWN script.
// No country flags are ever used to represent a language.

export type LocaleCode = "en" | "hi" | "ta";

export type LocaleMeta = {
  code: LocaleCode;
  nativeName: string; // shown in the switcher, in its own script
  englishName: string; // for aria-labels / screen readers
  fontClass: string; // Tailwind font family utility for correct script rendering
  ready: boolean;
};

export const LOCALES: LocaleMeta[] = [
  { code: "en", nativeName: "English", englishName: "English", fontClass: "font-sans", ready: true },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", fontClass: "font-deva", ready: true },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", fontClass: "font-tamil", ready: true },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_COOKIE = "ks_lang";

export function isLocale(v: string | undefined | null): v is LocaleCode {
  return !!v && LOCALES.some((l) => l.code === v && l.ready);
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
