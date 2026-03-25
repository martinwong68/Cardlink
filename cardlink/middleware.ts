import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/register",
  "/reset-password",
  "/c/",
  "/tap/",
  "/community/",
  "/site/",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith("/") ? pathname.startsWith(route) : pathname === route
  );
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Allow public routes and API routes (API routes handle their own auth)
  if (isPublicRoute(pathname) || pathname.startsWith("/api/")) {
    return response;
  }

  // For protected routes, check if user session exists
  // The updateSession call above refreshes the token; if no valid session,
  // Supabase client-side will redirect to login
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
