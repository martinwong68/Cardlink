import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales } from "../next-intl.config";

const isSupportedLocale = (
  value: string | undefined
): value is (typeof locales)[number] =>
  !!value && locales.includes(value as (typeof locales)[number]);

export default getRequestConfig(async ({ locale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const resolvedLocale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : isSupportedLocale(locale)
    ? locale
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
