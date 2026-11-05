import { NextRequest, NextResponse } from "next/server";

import { getNfcTap } from "@/src/lib/cardlink-api";

const redirectFor = (requestUrl: string, path: string) =>
  NextResponse.redirect(new URL(path, requestUrl));

/**
 * NFC entry: uid is never rewritten.
 * Resolves via Geekbobo-backend GET /api/cardlink/nfc/:uid, then redirects.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  if (!uid) {
    return redirectFor(request.url, "/tap/error");
  }

  try {
    const data = await getNfcTap(uid);

    if (!data) {
      return redirectFor(request.url, "/tap/no-card");
    }

    const action =
      typeof data.action === "string" && data.action ? data.action : "redirect";

    if (action === "redirect" || !data.action) {
      const slug = data.slug;
      if (typeof slug === "string" && slug) {
        return redirectFor(request.url, `/c/${slug}`);
      }
      return redirectFor(request.url, "/tap/error");
    }

    switch (action) {
      case "register":
        return redirectFor(request.url, `/register/${uid}`);
      case "suspended":
        return redirectFor(request.url, "/tap/suspended");
      case "deactivated":
        return redirectFor(request.url, "/tap/deactivated");
      case "expired":
        return redirectFor(request.url, "/tap/expired");
      case "no_card":
        return redirectFor(request.url, "/tap/no-card");
      default:
        return redirectFor(request.url, "/tap/error");
    }
  } catch (error) {
    console.error("NFC tap via cardlink API failed", { uid, error });
    return redirectFor(request.url, "/tap/error");
  }
}
