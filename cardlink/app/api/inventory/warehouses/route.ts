import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_warehouses")
    .select("id, company_id, name, code, address, is_active, is_default, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.warehouses.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    warehouses: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = body.name?.trim();
  const code = body.code?.trim();

  if (!name || !code) {
    return NextResponse.json({ error: "name and code are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_warehouses")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      code,
      address: body.address?.trim() || null,
      is_active: body.is_active ?? true,
      is_default: body.is_default ?? false,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.warehouses.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    warehouse_id: data.id,
  }, { status: 201 });
}
