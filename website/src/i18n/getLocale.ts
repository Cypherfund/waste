import { cookies } from "next/headers";
import { i18n, type Locale } from "./config";

export function getLocale(): Locale {
  const cookieStore = cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  if (locale && (i18n.locales as readonly string[]).includes(locale)) {
    return locale as Locale;
  }
  return i18n.defaultLocale;
}
