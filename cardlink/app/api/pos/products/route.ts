import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_products")
    .select("id, name, sku, barcode, category, price, cost, stock, image_url, is_active, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = (data ?? []).map((p) => ({
    ...p,
    unit: "pcs",
  }));

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_products")
    .insert({
      company_id: guard.context.activeCompanyId,
      name: body.name,
      sku: body.sku || null,
      barcode: body.barcode || null,
      category: body.category || null,
      price: body.price ?? 0,
      cost: body.cost ?? 0,
      stock: body.stock ?? 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: { ...data, unit: "pcs" } }, { status: 201 });
}
