import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { notifyLowStockServer } from "@/src/lib/business-notifications-server";

type MovementDraft = {
  company_id?: string;
  companyId?: string;
  product_id?: string;
  movement_type?: "in" | "out" | "adjust";
  qty?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: string;
  operation_id?: string;
  correlation_id?: string;
  idempotency_key?: string;
  occurred_at?: string;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id")?.trim() || null;
  const movementType = url.searchParams.get("movement_type")?.trim() || null;
  const referenceType = url.searchParams.get("reference_type")?.trim() || null;
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const supabase = await createClient();
  let query = supabase
    .from("inv_stock_movements")
    .select("id, company_id, product_id, movement_type, qty, reason, reference_type, reference_id, created_by, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (productId) query = query.eq("product_id", productId);
  if (movementType) query = query.eq("movement_type", movementType);
  if (referenceType) query = query.eq("reference_type", referenceType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.movements.v2",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    movements: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as MovementDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  if (!body.product_id || !body.movement_type) {
    return NextResponse.json(
      { error: "product_id and movement_type are required." },
      { status: 400 }
    );
  }

  if (typeof body.qty !== "number" || body.qty <= 0) {
    return NextResponse.json({ error: "qty must be a positive number." }, { status: 400 });
  }

  if (!["in", "out", "adjust"].includes(body.movement_type)) {
    return NextResponse.json({ error: "movement_type is invalid." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: productRow, error: productError } = await supabase
    .from("inv_products")
    .select("id, name, reorder_level")
    .eq("id", body.product_id)
    .eq("company_id", guard.context.activeCompanyId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  if (!productRow) {
    return NextResponse.json(
      { error: "product not found in active company scope." },
      { status: 404 }
    );
  }

  const { data, error } = await supabase.rpc("record_inventory_movement", {
    p_company_id: guard.context.activeCompanyId,
    p_product_id: body.product_id,
    p_movement_type: body.movement_type,
    p_qty: body.qty,
    p_reason: body.reason?.trim() || null,
    p_reference_type: body.reference_type?.trim() || null,
    p_reference_id: body.reference_id?.trim() || null,
    p_created_by: guard.context.user.id,
    p_idempotency_key: body.idempotency_key?.trim() || null,
    p_operation_id: body.operation_id?.trim() || null,
    p_correlation_id: body.correlation_id?.trim() || null,
    p_occurred_at: body.occurred_at?.trim() || null,
  });

  if (error) {
    if (error.message.includes("negative_stock_not_allowed")) {
      return NextResponse.json({ error: "stock out would result in negative on_hand." }, { status: 409 });
    }

    if (error.message.includes("product_not_found_in_company")) {
      return NextResponse.json({ error: "product not found in active company scope." }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json({ error: "movement write failed." }, { status: 500 });
  }

  // Low stock notification check
  const balanceOnHand = Number(result.balance_on_hand ?? 0);
  const reorderLevel = Number(productRow?.reorder_level ?? 5);
  if (balanceOnHand <= reorderLevel && productRow) {
    void notifyLowStockServer(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      body.product_id!,
      String(productRow.name),
      balanceOnHand
    );
  }

  return NextResponse.json(
    {
      contract: "inventory.movements.v1",
      status: result.status,
      company_id: guard.context.activeCompanyId,
      movement_id: result.movement_id,
      balance_on_hand: result.balance_on_hand,
      emitted_events: ["inventory.stock.moved"],
    },
    { status: result.status === "idempotent_replay" ? 200 : 201 }
  );
}
