import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type ItemDraft = {
  name?: string;
  sku?: string;
  description?: string;
  category?: string;
  unit_price?: number;
  cost_price?: number;
  unit?: string;
  tax_rate?: number;
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
    .select("id, company_id, name, sku, description, category, unit_price, cost_price, unit, tax_rate, is_active, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "items.v1",
    status: "ok",
    items: data ?? [],
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
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      unit_price: Number(body.unit_price ?? 0),
      cost_price: Number(body.cost_price ?? 0),
      unit: body.unit?.trim() || "pcs",
      tax_rate: Number(body.tax_rate ?? 0),
    })
    .select("id, name, sku, description, category, unit_price, cost_price, unit, tax_rate")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(
    { contract: "items.v1", status: "created", item: data },
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
  if (body.description !== undefined) payload.description = body.description.trim() || null;
  if (body.category !== undefined) payload.category = body.category.trim() || null;
  if (body.unit_price !== undefined) payload.unit_price = Number(body.unit_price);
  if (body.cost_price !== undefined) payload.cost_price = Number(body.cost_price);
  if (body.unit !== undefined) payload.unit = body.unit.trim() || "pcs";
  if (body.tax_rate !== undefined) payload.tax_rate = Number(body.tax_rate);

  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", body.id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, name, sku")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contract: "items.v1", status: "updated", item: data });
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

  return NextResponse.json({ contract: "items.v1", status: "deleted" });
}
