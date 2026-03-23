import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type ProductDraft = {
  company_id?: string;
  companyId?: string;
  sku?: string;
  name?: string;
  unit?: string;
  is_active?: boolean;
  description?: string;
  cost_price?: number;
  sell_price?: number;
  max_stock_level?: number;
  image_url?: string;
  category_id?: string;
  preferred_supplier_id?: string;
  barcode?: string;
  product_type?: string;
};

const PRODUCT_COLUMNS = [
  "id", "company_id", "sku", "name", "unit", "is_active",
  "description", "cost_price", "sell_price", "max_stock_level",
  "image_url", "category_id", "preferred_supplier_id", "barcode",
  "product_type", "reorder_level", "created_at", "updated_at",
].join(", ");

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("category_id")?.trim() || null;
  const activeOnly = url.searchParams.get("active_only") === "true";

  const supabase = await createClient();
  let query = supabase
    .from("inv_products")
    .select(PRODUCT_COLUMNS)
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "inventory.products.v2",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    products: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  const sku = body.sku?.trim();
  const name = body.name?.trim();
  const unit = body.unit?.trim() || "pcs";
  if (!sku || !name) {
    return NextResponse.json(
      { error: "sku and name are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_products")
    .insert({
      company_id: guard.context.activeCompanyId,
      sku,
      name,
      unit,
      is_active: body.is_active ?? true,
      description: body.description?.trim() || null,
      cost_price: body.cost_price ?? 0,
      sell_price: body.sell_price ?? 0,
      max_stock_level: body.max_stock_level ?? null,
      image_url: body.image_url?.trim() || null,
      category_id: body.category_id?.trim() || null,
      preferred_supplier_id: body.preferred_supplier_id?.trim() || null,
      barcode: body.barcode?.trim() || null,
      product_type: body.product_type?.trim() || "physical",
    })
    .select("id, company_id")
    .single();

  if (error) {
    const conflict = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.products.v2",
    status: "created",
    company_id: guard.context.activeCompanyId,
    product_id: data.id,
  }, { status: 201 });
}
