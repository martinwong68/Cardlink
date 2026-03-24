import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/** GET form submissions, PATCH to mark read */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const isRead = url.searchParams.get("is_read");

  const supabase = await createClient();
  let query = supabase
    .from("website_form_submissions")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (isRead === "true") query = query.eq("is_read", true);
  if (isRead === "false") query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { id?: string; is_read?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_form_submissions")
    .update({ is_read: body.is_read ?? true })
    .eq("id", body.id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "updated" });
}
