import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * GET /api/owner/integrations — List all integrations for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_integrations")
    .select("id, integration_key, config, is_active, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("integration_key");

  if (error) {
    /* Table may not exist yet — return empty */
    return NextResponse.json({ integrations: [] });
  }
  return NextResponse.json({ integrations: data ?? [] });
}

/**
 * POST /api/owner/integrations — Save/update an integration configuration.
 * Body: { integration_key: string, config: Record<string, string>, is_active: boolean }
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { integration_key?: string; config?: Record<string, string>; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const integrationKey = body.integration_key?.trim();
  if (!integrationKey) {
    return NextResponse.json({ error: "integration_key is required." }, { status: 400 });
  }

  const VALID_KEYS = new Set([
    "wordpress", "woocommerce", "shopify", "xero", "stripe",
    "mailchimp", "google_analytics", "zapier",
  ]);
  if (!VALID_KEYS.has(integrationKey)) {
    return NextResponse.json({ error: "Invalid integration key." }, { status: 400 });
  }

  const config = body.config ?? {};
  const isActive = body.is_active ?? false;
  const companyId = guard.context.activeCompanyId;

  const admin = createAdminClient();

  /* Check if row exists */
  const { data: existing } = await admin
    .from("company_integrations")
    .select("id")
    .eq("company_id", companyId)
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await admin
      .from("company_integrations")
      .update({
        config,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { error: insertError } = await admin
      .from("company_integrations")
      .insert({
        company_id: companyId,
        integration_key: integrationKey,
        config,
        is_active: isActive,
        created_by: guard.context.user.id,
      });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, integration_key: integrationKey, is_active: isActive });
}
