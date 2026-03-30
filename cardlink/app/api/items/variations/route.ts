import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type VariationDraft = {
  item_id?: string;
  attributes?: Record<string, string>;
  sku?: string;
  barcode?: string;
  price?: number;
  compare_at_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  weight?: number;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
};

/**
 * GET — List variations for a given item.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const itemId = url.searchParams.get("item_id")?.trim();

  if (!itemId) {
    return NextResponse.json({ error: "item_id query param is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_variations")
    .select("*")
    .eq("item_id", itemId)
    .eq("company_id", guard.context.activeCompanyId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "items.variations.v1",
    status: "ok",
    variations: data ?? [],
  });
}

/**
 * POST — Create a new variation.
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as VariationDraft;

  if (!body.item_id) {
    return NextResponse.json({ error: "item_id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_variations")
    .insert({
      item_id: body.item_id,
      company_id: guard.context.activeCompanyId,
      attributes: body.attributes ?? {},
      sku: body.sku?.trim() || null,
      barcode: body.barcode?.trim() || null,
      price: body.price ?? null,
      compare_at_price: body.compare_at_price ?? null,
      cost_price: body.cost_price ?? null,
      stock_quantity: body.stock_quantity ?? 0,
      weight: body.weight ?? null,
      image_url: body.image_url?.trim() || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(
    { contract: "items.variations.v1", status: "created", variation: data },
    { status: 201 },
  );
}

/**
 * PATCH — Update an existing variation.
 */
export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as VariationDraft & { id?: string };

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.attributes !== undefined) payload.attributes = body.attributes;
  if (body.sku !== undefined) payload.sku = body.sku?.trim() || null;
  if (body.barcode !== undefined) payload.barcode = body.barcode?.trim() || null;
  if (body.price !== undefined) payload.price = body.price;
  if (body.compare_at_price !== undefined) payload.compare_at_price = body.compare_at_price;
  if (body.cost_price !== undefined) payload.cost_price = body.cost_price;
  if (body.stock_quantity !== undefined) payload.stock_quantity = body.stock_quantity;
  if (body.weight !== undefined) payload.weight = body.weight;
  if (body.image_url !== undefined) payload.image_url = body.image_url?.trim() || null;
  if (body.is_active !== undefined) payload.is_active = body.is_active;
  if (body.sort_order !== undefined) payload.sort_order = body.sort_order;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_variations")
    .update(payload)
    .eq("id", body.id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contract: "items.variations.v1", status: "updated", variation: data });
}

/**
 * DELETE — Remove a variation by id.
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
    .from("item_variations")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contract: "items.variations.v1", status: "deleted" });
}
