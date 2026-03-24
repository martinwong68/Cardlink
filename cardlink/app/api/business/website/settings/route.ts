import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/** GET/POST (upsert) website settings for the authenticated company */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_settings")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_settings")
    .upsert(
      { ...body, company_id: guard.context.activeCompanyId, updated_at: new Date().toISOString() },
      { onConflict: "company_id" }
    )
    .select("id, site_title, is_published")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "saved", settings: data });
}
