import { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "./lib/supabase/middleware";
import { defaultLocale, locales } from "../next-intl.config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
