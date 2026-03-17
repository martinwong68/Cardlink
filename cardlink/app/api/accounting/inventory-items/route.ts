import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type InventoryItemDraft = {
  org_id?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unit_cost?: number;
  account_id?: string | null;
  category?: string;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, org_id, name, sku, quantity, unit_cost, account_id, category, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.inventory_items.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    inventory_items: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as InventoryItemDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  const sku = body.sku?.trim();
  if (!name || !sku) {
    return NextResponse.json({ error: "name and sku are required." }, { status: 400 });
  }

  const supabase = await createClient();

  if (body.account_id) {
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("id")
      .eq("org_id", guard.context.organizationId)
      .eq("id", body.account_id)
      .maybeSingle();

    if (!accountRow) {
      return NextResponse.json({ error: "account_id is outside organization scope." }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      org_id: guard.context.organizationId,
      name,
      sku,
      quantity: Number(body.quantity ?? 0),
      unit_cost: Number(body.unit_cost ?? 0),
      account_id: body.account_id ?? null,
      category: body.category?.trim() || null,
    })
    .select("id, name, sku, quantity, unit_cost, account_id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(
    {
      contract: "accounting.inventory_items.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      inventory_item: data,
      emitted_events: ["accounting.inventory_item.created"],
    },
    { status: 201 }
  );
}
