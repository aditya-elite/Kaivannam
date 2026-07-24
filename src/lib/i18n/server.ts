import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type LocaleCode } from "./config";
import { makeT } from "./translate";

/** Resolve the active locale from the cookie in a server component. */
export async function getLocale(): Promise<LocaleCode> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Translate function + locale for server components. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
