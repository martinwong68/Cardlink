import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type ProductAttribute = {
  name: string;
  options: string[];
  variation?: boolean;
};

type ItemDraft = {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  unit_price?: number;
  cost_price?: number;
  unit?: string;
  tax_rate?: number;
  stock_quantity?: number;
  reorder_level?: number;
  track_inventory?: boolean;
  is_active?: boolean;
  image_url?: string;
  sync_to_pos?: boolean;
  sync_to_store?: boolean;
  sync_to_inventory?: boolean;
  credit_account_id?: string | null;
  debit_account_id?: string | null;
  variant_attribute?: string | null;
  variant_value?: string | null;
  product_type?: string;
  product_attributes?: ProductAttribute[];
  images?: string[];
  slug?: string;
  compare_at_price?: number | null;
  weight?: number | null;
  max_stock_level?: number | null;
};

/**
 * GET — List all master items for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map database fields to frontend-expected fields
  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku ?? null,
    barcode: row.barcode ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    unit_price: Number(row.unit_price ?? 0),
    cost_price: Number(row.cost_price ?? 0),
    unit: row.unit ?? "pcs",
    tax_rate: Number(row.tax_rate ?? 0),
    stock_quantity: Number(row.stock_quantity ?? 0),
    reorder_level: Number(row.reorder_level ?? 0),
    image_url: row.image_url ?? null,
    is_active: row.is_active ?? true,
    track_inventory: row.track_inventory ?? true,
    synced_to_pos: row.synced_to_pos ?? true,
    synced_to_store: row.synced_to_store ?? true,
    synced_to_inventory: row.synced_to_inventory ?? true,
    credit_account_id: row.credit_account_id ?? null,
    debit_account_id: row.debit_account_id ?? null,
    variant_attribute: row.variant_attribute ?? null,
    variant_value: row.variant_value ?? null,
    product_type: row.product_type ?? "simple",
    product_attributes: row.product_attributes ?? [],
    images: row.images ?? [],
    slug: row.slug ?? null,
    compare_at_price: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    max_stock_level: row.max_stock_level ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return NextResponse.json({
    contract: "items.v2",
    status: "ok",
    items,
  });
}

/**
 * POST — Create a new master item.
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as ItemDraft;

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      sku: body.sku?.trim() || null,
      barcode: body.barcode?.trim() || null,
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      unit_price: Number(body.unit_price ?? 0),
      cost_price: Number(body.cost_price ?? 0),
      unit: body.unit?.trim() || "pcs",
      tax_rate: Number(body.tax_rate ?? 0),
      stock_quantity: Number(body.stock_quantity ?? 0),
      reorder_level: Number(body.reorder_level ?? 0),
      track_inventory: body.track_inventory ?? true,
      is_active: body.is_active ?? true,
      image_url: body.image_url?.trim() || null,
      synced_to_pos: body.sync_to_pos ?? true,
      synced_to_store: body.sync_to_store ?? true,
      synced_to_inventory: body.sync_to_inventory ?? true,
      credit_account_id: body.credit_account_id || null,
      debit_account_id: body.debit_account_id || null,
      variant_attribute: body.variant_attribute?.trim() || null,
      variant_value: body.variant_value?.trim() || null,
      product_type: body.product_type?.trim() || "simple",
      product_attributes: body.product_attributes ?? [],
      images: body.images ?? [],
      slug: body.slug?.trim() || null,
      compare_at_price: body.compare_at_price ?? null,
      weight: body.weight ?? null,
      max_stock_level: body.max_stock_level ?? null,
    })
    .select("*")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(
    { contract: "items.v2", status: "created", item: data },
    { status: 201 },
  );
}

/**
 * PATCH — Update an existing master item.
 */
export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as ItemDraft & { id?: string };

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) payload.name = body.name.trim();
  if (body.sku !== undefined) payload.sku = body.sku.trim() || null;
  if (body.barcode !== undefined) payload.barcode = body.barcode.trim() || null;
  if (body.description !== undefined) payload.description = body.description.trim() || null;
  if (body.category !== undefined) payload.category = body.category.trim() || null;
  if (body.unit_price !== undefined) payload.unit_price = Number(body.unit_price);
  if (body.cost_price !== undefined) payload.cost_price = Number(body.cost_price);
  if (body.unit !== undefined) payload.unit = body.unit.trim() || "pcs";
  if (body.tax_rate !== undefined) payload.tax_rate = Number(body.tax_rate);
  if (body.stock_quantity !== undefined) payload.stock_quantity = Number(body.stock_quantity);
  if (body.reorder_level !== undefined) payload.reorder_level = Number(body.reorder_level);
  if (body.track_inventory !== undefined) payload.track_inventory = body.track_inventory;
  if (body.is_active !== undefined) payload.is_active = body.is_active;
  if (body.image_url !== undefined) payload.image_url = body.image_url.trim() || null;
  if (body.sync_to_pos !== undefined) payload.synced_to_pos = body.sync_to_pos;
  if (body.sync_to_store !== undefined) payload.synced_to_store = body.sync_to_store;
  if (body.sync_to_inventory !== undefined) payload.synced_to_inventory = body.sync_to_inventory;
  if (body.credit_account_id !== undefined) payload.credit_account_id = body.credit_account_id || null;
  if (body.debit_account_id !== undefined) payload.debit_account_id = body.debit_account_id || null;
  if (body.variant_attribute !== undefined) payload.variant_attribute = body.variant_attribute?.trim() || null;
  if (body.variant_value !== undefined) payload.variant_value = body.variant_value?.trim() || null;
  if (body.product_type !== undefined) payload.product_type = body.product_type?.trim() || "simple";
  if (body.product_attributes !== undefined) payload.product_attributes = body.product_attributes;
  if (body.images !== undefined) payload.images = body.images;
  if (body.slug !== undefined) payload.slug = body.slug?.trim() || null;
  if (body.compare_at_price !== undefined) payload.compare_at_price = body.compare_at_price;
  if (body.weight !== undefined) payload.weight = body.weight;
  if (body.max_stock_level !== undefined) payload.max_stock_level = body.max_stock_level;

  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", body.id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contract: "items.v2", status: "updated", item: data });
}

/**
 * DELETE — Remove a master item by id (passed in query string).
 */
export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query parameter is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contract: "items.v2", status: "deleted" });
}
