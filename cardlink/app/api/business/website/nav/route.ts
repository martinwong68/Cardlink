import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/** GET/POST website navigation items */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_nav_items")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { label?: string; url?: string; page_id?: string; parent_id?: string; sort_order?: number; is_visible?: boolean; open_in_new_tab?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  if (!body.label || !body.url) {
    return NextResponse.json({ error: "label and url are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_nav_items")
    .insert({
      company_id: guard.context.activeCompanyId,
      label: body.label,
      url: body.url,
      page_id: body.page_id ?? null,
      parent_id: body.parent_id ?? null,
      sort_order: body.sort_order ?? 0,
      is_visible: body.is_visible ?? true,
      open_in_new_tab: body.open_in_new_tab ?? false,
    })
    .select("id, label, url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "created", item: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_nav_items")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "deleted" });
}
