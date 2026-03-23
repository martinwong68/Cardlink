import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "status", "expected_at", "terms", "notes",
    "discount_percent", "tax_percent", "shipping_cost", "payment_terms",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (body.status) {
    const validStatuses = ["draft", "submitted", "ordered", "partial", "received", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_purchase_orders")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Purchase order not found." },
      { status: error ? 500 : 404 },
    );
  }

  return NextResponse.json({
    contract: "procurement.purchase_orders.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    purchase_order_id: data.id,
    po_status: data.status,
    emitted_events: [`procurement.po.${data.status}`],
  });
}
