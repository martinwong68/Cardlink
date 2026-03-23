import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createPosRefundJournalEntry } from "@/src/lib/cross-module-integration";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // ── Fetch existing order ──────────────────────────────────
  const { data: order, error: fetchErr } = await supabase
    .from("pos_orders")
    .select("id, order_number, total, status, company_id")
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // ── Status update ─────────────────────────────────────────
  const newStatus = body.status;
  const updates: Record<string, unknown> = {};

  if (newStatus === "refunded" && order.status === "completed") {
    // Determine refund amount (full or partial)
    const refundAmount = Number(body.refund_amount ?? order.total ?? 0);
    updates.status = "refunded";
    updates.refund_amount = refundAmount;
    updates.refund_reason = body.refund_reason ?? null;
    updates.refunded_at = new Date().toISOString();
    updates.refunded_by = guard.context.user.id;

    // ── Reverse accounting entry (Dr Revenue / Cr Cash) ─────
    void createPosRefundJournalEntry(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      order.id as string,
      refundAmount,
      String(order.order_number ?? order.id),
    );

    // ── Reverse inventory for refunded items ────────────────
    // If specific items provided, refund only those
    const refundItems: Array<{ product_id: string; inv_product_id?: string; qty: number }> = body.refund_items ?? [];

    if (refundItems.length > 0) {
      // Partial refund — specific items
      for (const item of refundItems) {
        const invProductId = item.inv_product_id || item.product_id;
        if (invProductId && item.qty > 0) {
          void supabase.rpc("record_inventory_movement", {
            p_company_id: guard.context.activeCompanyId,
            p_product_id: invProductId,
            p_movement_type: "in",
            p_qty: item.qty,
            p_reason: `POS refund: ${order.order_number}`,
            p_reference_type: "pos_refund",
            p_reference_id: order.id,
            p_created_by: guard.context.user.id,
            p_idempotency_key: `pos-refund-${order.id}-${invProductId}`,
            p_operation_id: null,
            p_correlation_id: null,
            p_occurred_at: null,
          });
        }

        // Mark line item as refunded
        if (item.product_id) {
          await supabase
            .from("pos_order_items")
            .update({ refunded_qty: item.qty })
            .eq("order_id", order.id)
            .eq("product_id", item.product_id);
        }
      }
    } else {
      // Full refund — re-stock all items
      const { data: lineItems } = await supabase
        .from("pos_order_items")
        .select("product_id, qty")
        .eq("order_id", order.id);

      if (lineItems) {
        for (const li of lineItems) {
          // Look up inv_product_id from pos_products
          const { data: product } = await supabase
            .from("pos_products")
            .select("inv_product_id")
            .eq("id", li.product_id)
            .maybeSingle();

          const invId = product?.inv_product_id ?? li.product_id;
          if (invId && li.qty > 0) {
            void supabase.rpc("record_inventory_movement", {
              p_company_id: guard.context.activeCompanyId,
              p_product_id: invId,
              p_movement_type: "in",
              p_qty: li.qty,
              p_reason: `POS refund: ${order.order_number}`,
              p_reference_type: "pos_refund",
              p_reference_id: order.id,
              p_created_by: guard.context.user.id,
              p_idempotency_key: `pos-refund-${order.id}-${invId}`,
              p_operation_id: null,
              p_correlation_id: null,
              p_occurred_at: null,
            });
          }

          // Mark all line items as refunded
          await supabase
            .from("pos_order_items")
            .update({ refunded_qty: li.qty })
            .eq("order_id", order.id)
            .eq("product_id", li.product_id);
        }
      }
    }
  } else if (newStatus !== undefined) {
    updates.status = newStatus;
  }

  if (body.notes !== undefined) updates.notes = body.notes;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("pos_orders")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
