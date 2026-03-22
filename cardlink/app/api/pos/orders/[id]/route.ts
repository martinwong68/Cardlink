import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await supabase
    .from("pos_orders")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Cross-module: auto-restock inventory on refund */
  if (body.status === "refunded" && data) {
    const { data: orderItems } = await supabase
      .from("pos_order_items")
      .select("product_id, qty")
      .eq("order_id", id);

    if (orderItems?.length) {
      for (const item of orderItems) {
        if (item.product_id && Number(item.qty) > 0) {
          void supabase.rpc("record_inventory_movement", {
            p_company_id: guard.context.activeCompanyId,
            p_product_id: item.product_id,
            p_movement_type: "in",
            p_qty: Number(item.qty),
            p_reason: `POS refund: order ${data.order_number}`,
            p_reference_type: "pos_refund",
            p_reference_id: id,
            p_created_by: guard.context.user.id,
            p_idempotency_key: `pos-refund-${id}-${item.product_id}`,
            p_operation_id: null,
            p_correlation_id: null,
            p_occurred_at: null,
          });
        }
      }
    }
  }

  return NextResponse.json({ order: data });
}
