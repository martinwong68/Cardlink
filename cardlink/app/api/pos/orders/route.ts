import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { notifyNewOrderServer } from "@/src/lib/business-notifications-server";
import { createPosOrderJournalEntry } from "@/src/lib/cross-module-integration";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_orders")
    .select("id, order_number, subtotal, tax, total, payment_method, status, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o) => ({
    id: o.id,
    receipt_number: o.order_number,
    subtotal: o.subtotal,
    tax_amount: o.tax,
    total: o.total,
    payment_method: o.payment_method,
    status: o.status,
    created_at: o.created_at,
  }));

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("pos_orders")
    .insert({
      company_id: guard.context.activeCompanyId,
      order_number: body.receipt_number,
      subtotal: body.subtotal,
      tax: body.tax_amount,
      total: body.total,
      payment_method: body.payment_method,
      status: body.status ?? "completed",
      created_by: guard.context.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert line items if provided
  if (body.line_items?.length && order) {
    const items = body.line_items.map((li: { productId?: string; name: string; quantity: number; unitPrice: number; total: number }) => ({
      order_id: order.id,
      product_id: li.productId || null,
      product_name: li.name,
      qty: li.quantity,
      unit_price: li.unitPrice,
      subtotal: li.total,
    }));
    await supabase.from("pos_order_items").insert(items);
  }

  // Notify new order
  if (order) {
    void notifyNewOrderServer(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      order.id as string,
      Number(order.total ?? 0)
    );

    // Cross-module: create accounting journal entry for POS sale
    void createPosOrderJournalEntry(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      order.id as string,
      Number(order.total ?? 0),
      String(order.order_number ?? order.id),
    );

    // Cross-module: deduct inventory for items linked to inv_products
    if (body.line_items?.length) {
      for (const li of body.line_items as Array<{ productId?: string; inv_product_id?: string; quantity: number }>) {
        const invProductId = li.inv_product_id || li.productId;
        if (invProductId && li.quantity > 0) {
          void supabase.rpc("record_inventory_movement", {
            p_company_id: guard.context.activeCompanyId,
            p_product_id: invProductId,
            p_movement_type: "out",
            p_qty: li.quantity,
            p_reason: `POS sale: ${order.order_number}`,
            p_reference_type: "pos_order",
            p_reference_id: order.id,
            p_created_by: guard.context.user.id,
            p_idempotency_key: `pos-inv-${order.id}-${invProductId}`,
            p_operation_id: null,
            p_correlation_id: null,
            p_occurred_at: null,
          });
        }
      }
    }
  }

  return NextResponse.json({
    order: {
      id: order.id,
      receipt_number: order.order_number,
      subtotal: order.subtotal,
      tax_amount: order.tax,
      total: order.total,
      payment_method: order.payment_method,
      status: order.status,
      created_at: order.created_at,
    },
  }, { status: 201 });
}
