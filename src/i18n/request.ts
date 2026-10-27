import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALES, type Locale } from "@/templates/types";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Cookie preference first, then the browser's Accept-Language header. */
async function detectLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const lang = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async ({ locale }) => {
  // An explicit locale (e.g. a client questionnaire in the brief's language) wins.
  const resolved = isLocale(locale) ? locale : await detectLocale();
  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
    timeZone: "UTC",
  };
});
