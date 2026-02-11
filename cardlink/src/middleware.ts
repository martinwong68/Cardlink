import { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "./lib/supabase/middleware";
import { defaultLocale, locales } from "../next-intl.config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeDetection: false,
});

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeCookie && !locales.includes(localeCookie as (typeof locales)[number])) {
    response.cookies.delete("NEXT_LOCALE");
  }
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
