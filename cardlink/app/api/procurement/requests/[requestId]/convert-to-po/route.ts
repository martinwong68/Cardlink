import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const body = await request.json();
  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId: body.company_id?.trim(),
  });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const requestId = params.requestId;

  const supabase = await createClient();

  /* 1. Fetch the purchase request */
  const { data: pr, error: prError } = await supabase
    .from("proc_purchase_requests")
    .select("id, pr_number, title, description, status, total_estimated")
    .eq("id", requestId)
    .eq("company_id", guard.context.activeCompanyId)
    .single();

  if (prError || !pr) {
    return NextResponse.json(
      { error: "Purchase request not found." },
      { status: 404 },
    );
  }

  if (pr.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved requests can be converted to PO." },
      { status: 400 },
    );
  }

  if (!body.supplier_id) {
    return NextResponse.json(
      { error: "supplier_id is required to convert request to PO." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one item is required." },
      { status: 400 },
    );
  }

  /* 2. Validate supplier */
  const { data: supplier } = await supabase
    .from("proc_suppliers")
    .select("id")
    .eq("id", body.supplier_id)
    .eq("company_id", guard.context.activeCompanyId)
    .maybeSingle();

  if (!supplier) {
    return NextResponse.json(
      { error: "Supplier not found." },
      { status: 404 },
    );
  }

  /* 3. Create PO linked to request */
  const poNumber = body.po_number?.trim() || `PO-${Date.now().toString(36).toUpperCase()}`;

  const { data: poRow, error: poError } = await supabase
    .from("proc_purchase_orders")
    .insert({
      company_id: guard.context.activeCompanyId,
      supplier_id: body.supplier_id,
      po_number: poNumber,
      request_id: requestId,
      status: "draft",
      ordered_at: new Date().toISOString(),
      expected_at: body.expected_at || null,
      notes: pr.description || null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (poError || !poRow) {
    const conflict = poError?.code === "23505";
    return NextResponse.json(
      { error: poError?.message ?? "PO creation failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  /* 4. Insert PO items */
  const itemPayload = body.items.map((item: { product_id: string; qty: number; unit_cost?: number }) => ({
    company_id: guard.context.activeCompanyId,
    po_id: poRow.id,
    product_id: item.product_id,
    qty: item.qty,
    unit_cost: item.unit_cost ?? 0,
  }));

  const { error: itemError } = await supabase
    .from("proc_purchase_order_items")
    .insert(itemPayload);

  if (itemError) {
    await supabase.from("proc_purchase_orders").delete().eq("id", poRow.id);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "procurement.requests.v1",
      status: "converted",
      company_id: guard.context.activeCompanyId,
      request_id: requestId,
      purchase_order_id: poRow.id,
      po_number: poNumber,
      emitted_events: ["procurement.request.converted", "procurement.po.created"],
    },
    { status: 201 },
  );
}
