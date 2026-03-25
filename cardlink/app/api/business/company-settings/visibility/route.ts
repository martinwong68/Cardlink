import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const VALID_VISIBILITY = ["public", "all_users", "members_only"] as const;
type VisibilityLevel = (typeof VALID_VISIBILITY)[number];

function isValidVisibility(v: unknown): v is VisibilityLevel {
  return typeof v === "string" && VALID_VISIBILITY.includes(v as VisibilityLevel);
}

/**
 * GET /api/business/company-settings/visibility
 * Returns community and store visibility settings for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("companies")
    .select("community_enabled, community_visibility, store_visibility")
    .eq("id", companyId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    community_enabled: data?.community_enabled ?? false,
    community_visibility: data?.community_visibility ?? "public",
    store_visibility: data?.store_visibility ?? "public",
  });
}

/**
 * PUT /api/business/company-settings/visibility
 * Updates community and store visibility settings.
 */
export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  const update: Record<string, unknown> = {};

  if (typeof body.community_enabled === "boolean") {
    update.community_enabled = body.community_enabled;
  }
  if (isValidVisibility(body.community_visibility)) {
    update.community_visibility = body.community_visibility;
  }
  if (isValidVisibility(body.store_visibility)) {
    update.store_visibility = body.store_visibility;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
