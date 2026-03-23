import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_categories")
    .select("id, company_id, name, parent_id, sort_order, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.categories.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    categories: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_categories")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      parent_id: body.parent_id?.trim() || null,
      sort_order: body.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.categories.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    category_id: data.id,
  }, { status: 201 });
}
