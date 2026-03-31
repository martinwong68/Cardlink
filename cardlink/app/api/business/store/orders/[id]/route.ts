import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createStoreRefundJournalEntry } from "@/src/lib/cross-module-integration";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ── GET /api/business/store/orders/[id] — Order detail ──── */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("store_orders")
    .select("*")
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Fetch line items
  const { data: items } = await supabase
    .from("store_order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at");

  return NextResponse.json({ order, items: items ?? [] });
}

/* ── PATCH /api/business/store/orders/[id] — Update order ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Fetch existing
  const { data: order, error: fetchErr } = await supabase
    .from("store_orders")
    .select("id, order_number, total, status, payment_status, company_id")
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const newStatus = body.status as string | undefined;

  // ── Status transitions ──
  if (newStatus) {
    updates.status = newStatus;

    if (newStatus === "shipped") {
      updates.shipped_at = new Date().toISOString();
      if (body.tracking_number) updates.tracking_number = body.tracking_number;
      if (body.shipping_method) updates.shipping_method = body.shipping_method;
    }

    if (newStatus === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    if (newStatus === "cancelled" && !["completed", "delivered", "refunded"].includes(order.status as string)) {
      updates.status = "cancelled";
      // Re-stock items
      await restockOrderItems(supabase, id, order.id as string, guard.context.activeCompanyId, guard.context.user.id, order.order_number as string);
    }

    if (newStatus === "refunded" && ["completed", "delivered", "confirmed", "processing"].includes(order.status as string)) {
      const refundAmount = Number(body.refund_amount ?? order.total ?? 0);
      updates.status = "refunded";
      updates.refund_amount = refundAmount;
      updates.refund_reason = body.refund_reason ?? null;
      updates.refunded_at = new Date().toISOString();
      updates.refunded_by = guard.context.user.id;
      updates.payment_status = "refunded";

      // Reverse accounting
      void createStoreRefundJournalEntry(
        supabase,
        guard.context.activeCompanyId,
        guard.context.user.id,
        order.id as string,
        refundAmount,
        String(order.order_number ?? order.id),
      );

      // Re-stock
      await restockOrderItems(supabase, id, order.id as string, guard.context.activeCompanyId, guard.context.user.id, order.order_number as string);
    }
  }

  // Payment status
  if (body.payment_status) {
    updates.payment_status = body.payment_status;
    if (body.payment_status === "paid") updates.paid_at = new Date().toISOString();
  }

  if (body.payment_method) updates.payment_method = body.payment_method;
  if (body.tracking_number !== undefined) updates.tracking_number = body.tracking_number;
  if (body.shipping_method !== undefined) updates.shipping_method = body.shipping_method;
  if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data: updated, error: updateErr } = await supabase
    .from("store_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ order: updated });
}

/* ── Helper: re-stock items when order is cancelled/refunded ── */
async function restockOrderItems(
  supabase: SupabaseClient,
  orderId: string,
  _orderUuid: string,
  companyId: string,
  userId: string,
  orderNumber: string,
) {
  const { data: lineItems } = await supabase
    .from("store_order_items")
    .select("product_id, qty, product_type")
    .eq("order_id", orderId);

  if (!lineItems) return;

  for (const li of lineItems) {
    if (li.product_id && li.qty > 0 && (li.product_type ?? "physical") === "physical") {
      // Re-stock store_products
      const { data: prod } = await supabase
        .from("store_products")
        .select("stock_quantity")
        .eq("id", li.product_id)
        .single();

      if (prod && prod.stock_quantity != null) {
        await supabase
          .from("store_products")
          .update({ stock_quantity: (prod.stock_quantity as number) + (li.qty as number) })
          .eq("id", li.product_id);
      }

      // Reverse inventory movement
      void supabase.rpc("record_inventory_movement", {
        p_company_id: companyId,
        p_product_id: li.product_id,
        p_movement_type: "in",
        p_qty: li.qty,
        p_reason: `Store order refund/cancel: ${orderNumber}`,
        p_reference_type: "store_refund",
        p_reference_id: orderId,
        p_created_by: userId,
        p_idempotency_key: `store-refund-${orderId}-${li.product_id}`,
        p_operation_id: null,
        p_correlation_id: null,
        p_occurred_at: null,
      });
      // Inventory module may not exist — errors are silent

      // Mark line item as refunded
      await supabase
        .from("store_order_items")
        .update({ refunded_qty: li.qty })
        .eq("order_id", orderId)
        .eq("product_id", li.product_id);
    }
  }
}
