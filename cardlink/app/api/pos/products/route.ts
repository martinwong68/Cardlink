import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * GET — List POS products.
 * Reads from pos_products table AND from items table (where synced_to_pos = true).
 * Items from the master table take priority and include cost for COGS.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // 1. Fetch POS-specific products
  const { data: posData, error: posError } = await supabase
    .from("pos_products")
    .select("id, name, sku, barcode, category, price, cost, stock, image_url, is_active, created_at, master_item_id")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (posError) return NextResponse.json({ error: posError.message }, { status: 500 });

  // 2. Fetch master items synced to POS
  const { data: masterData } = await supabase
    .from("items")
    .select("id, name, sku, barcode, category, unit_price, cost_price, stock_quantity, image_url, is_active, created_at, unit")
    .eq("company_id", companyId)
    .eq("synced_to_pos", true)
    .eq("is_active", true)
    .order("name", { ascending: true });

  // 3. Build unified product list — master items first, then POS-only products
  const masterIds = new Set((masterData ?? []).map((m) => m.id));
  const posOnlyProducts = (posData ?? []).filter((p) => !p.master_item_id || !masterIds.has(p.master_item_id));

  const masterProducts = (masterData ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    sku: m.sku,
    barcode: m.barcode,
    category: m.category,
    price: Number(m.unit_price ?? 0),
    cost: Number(m.cost_price ?? 0),
    stock: Number(m.stock_quantity ?? 0),
    image_url: m.image_url,
    is_active: m.is_active,
    created_at: m.created_at,
    unit: m.unit ?? "pcs",
    source: "item_master",
  }));

  const legacyProducts = posOnlyProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    price: Number(p.price ?? 0),
    cost: Number(p.cost ?? 0),
    stock: Number(p.stock ?? 0),
    image_url: p.image_url,
    is_active: p.is_active,
    created_at: p.created_at,
    unit: "pcs",
    source: "pos_products",
  }));

  const products = [...masterProducts, ...legacyProducts];

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
