import { dictionaries, type Dict } from "./dictionaries";
import { DEFAULT_LOCALE, type LocaleCode } from "./config";

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Build a translate function for a locale, falling back to English per-key. */
export function makeT(locale: LocaleCode): TFunc {
  const dict: Dict = dictionaries[locale] ?? {};
  const fallback: Dict = dictionaries[DEFAULT_LOCALE];
  return (key, vars) => {
    const raw = dict[key] ?? fallback[key] ?? key;
    return interpolate(raw, vars);
  };
}
