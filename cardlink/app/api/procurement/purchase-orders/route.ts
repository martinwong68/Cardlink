import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type PurchaseOrderItem = {
  po_item_id?: string;
  product_id?: string;
  qty?: number;
  unit_cost?: number;
};

type PurchaseOrderDraft = {
  company_id?: string;
  companyId?: string;
  supplier_id?: string;
  po_number?: string;
  expected_at?: string;
  items?: PurchaseOrderItem[];
  operation_id?: string;
  correlation_id?: string;
  idempotency_key?: string;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data: poRows, error: poError } = await supabase
    .from("proc_purchase_orders")
    .select("id, company_id, supplier_id, po_number, status, ordered_at, expected_at, idempotency_key, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (poError) {
    return NextResponse.json({ error: poError.message }, { status: 500 });
  }

  const orderIds = (poRows ?? []).map((row) => row.id);
  const { data: itemRows, error: itemError } = orderIds.length
    ? await supabase
        .from("proc_purchase_order_items")
        .select("id, po_id, product_id, qty, unit_cost")
        .in("po_id", orderIds)
    : { data: [], error: null };

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const itemMap = new Map<string, unknown[]>();
  (itemRows ?? []).forEach((item) => {
    const list = itemMap.get(item.po_id) ?? [];
    list.push(item);
    itemMap.set(item.po_id, list);
  });

  const purchaseOrders = (poRows ?? []).map((po) => ({
    ...po,
    items: itemMap.get(po.id) ?? [],
  }));

  return NextResponse.json({
    contract: "procurement.purchase_orders.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    purchase_orders: purchaseOrders,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as PurchaseOrderDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  if (!body.supplier_id || !body.po_number) {
    return NextResponse.json(
      { error: "supplier_id and po_number are required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
  }

  const invalidItem = body.items.some(
    (item) =>
      !item.product_id ||
      typeof item.qty !== "number" ||
      item.qty <= 0 ||
      (item.unit_cost !== undefined && (typeof item.unit_cost !== "number" || item.unit_cost < 0))
  );

  if (invalidItem) {
    return NextResponse.json(
      { error: "Each item requires product_id, qty > 0, and optional unit_cost >= 0." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  if (body.idempotency_key?.trim()) {
    const { data: existingPo } = await supabase
      .from("proc_purchase_orders")
      .select("id")
      .eq("company_id", guard.context.activeCompanyId)
      .eq("idempotency_key", body.idempotency_key.trim())
      .maybeSingle();

    if (existingPo) {
      return NextResponse.json(
        {
          contract: "procurement.purchase_orders.v1",
          status: "idempotent_replay",
          company_id: guard.context.activeCompanyId,
          purchase_order_id: existingPo.id,
        },
        { status: 200 }
      );
    }
  }

  const { data: supplierRow, error: supplierError } = await supabase
    .from("proc_suppliers")
    .select("id")
    .eq("id", body.supplier_id)
    .eq("company_id", guard.context.activeCompanyId)
    .maybeSingle();

  if (supplierError) {
    return NextResponse.json({ error: supplierError.message }, { status: 500 });
  }

  if (!supplierRow) {
    return NextResponse.json({ error: "supplier not found in active company scope." }, { status: 404 });
  }

  const productIds = Array.from(new Set(body.items.map((item) => item.product_id as string)));
  const { data: productRows, error: productError } = await supabase
    .from("inv_products")
    .select("id")
    .eq("company_id", guard.context.activeCompanyId)
    .in("id", productIds);

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  const productSet = new Set((productRows ?? []).map((row) => row.id));
  if (productSet.size !== productIds.length) {
    return NextResponse.json(
      { error: "One or more products are outside active company scope." },
      { status: 403 }
    );
  }

  const { data: poRow, error: poInsertError } = await supabase
    .from("proc_purchase_orders")
    .insert({
      company_id: guard.context.activeCompanyId,
      supplier_id: body.supplier_id,
      po_number: body.po_number.trim(),
      status: "submitted",
      ordered_at: new Date().toISOString(),
      expected_at: body.expected_at?.trim() || null,
      idempotency_key: body.idempotency_key?.trim() || null,
      operation_id: body.operation_id?.trim() || null,
      correlation_id: body.correlation_id?.trim() || null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (poInsertError || !poRow) {
    const conflict = poInsertError?.code === "23505";
    return NextResponse.json({ error: poInsertError?.message ?? "PO create failed." }, { status: conflict ? 409 : 400 });
  }

  const itemPayload = body.items.map((item) => ({
    company_id: guard.context.activeCompanyId,
    po_id: poRow.id,
    product_id: item.product_id,
    qty: item.qty,
    unit_cost: item.unit_cost ?? 0,
  }));

  const { error: itemInsertError } = await supabase.from("proc_purchase_order_items").insert(itemPayload);
  if (itemInsertError) {
    await supabase.from("proc_purchase_orders").delete().eq("id", poRow.id);
    return NextResponse.json({ error: itemInsertError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "procurement.purchase_orders.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      purchase_order_id: poRow.id,
      item_count: body.items.length,
      emitted_events: ["procurement.po.created"],
    },
    { status: 201 }
  );
}
