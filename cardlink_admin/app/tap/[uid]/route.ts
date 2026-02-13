import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const redirectFor = (requestUrl: string, path: string) =>
  NextResponse.redirect(new URL(path, requestUrl));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!uid || !supabaseUrl || !serviceRoleKey) {
    return redirectFor(request.url, "/tap/error");
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim() || "";
  const requestUserAgent = request.headers.get("user-agent") ?? "";

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc("handle_nfc_tap", {
    nfc_uid: uid,
    ip: requestIp,
    user_agent: requestUserAgent,
  });

  if (error || !data) {
    return redirectFor(request.url, "/tap/error");
  }

  const action = typeof data.action === "string" ? data.action : "error";

  if (action === "redirect") {
    const slug =
      data.slug ??
      data.card_slug ??
      data.linked_card_slug ??
      data.redirect_slug;
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
}
