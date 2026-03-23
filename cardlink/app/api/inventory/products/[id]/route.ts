import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inv_products")
    .select("*")
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "product not found." }, { status: 404 });

  return NextResponse.json({
    contract: "inventory.products.v2",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    product: data,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const allowed = [
    "sku", "name", "unit", "is_active", "description",
    "cost_price", "sell_price", "max_stock_level", "image_url",
    "category_id", "preferred_supplier_id", "barcode", "product_type",
    "reorder_level",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = typeof body[key] === "string" ? body[key].trim() || null : body[key];
    }
  }

  const { data, error } = await supabase
    .from("inv_products")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.products.v2",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    product_id: data.id,
  });
}
