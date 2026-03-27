import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { notifyNewOrderServer } from "@/src/lib/business-notifications-server";
import { createPosOrderJournalEntry } from "@/src/lib/cross-module-integration";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const search = url.searchParams.get("search");

  const supabase = await createClient();
  let query = supabase
    .from("pos_orders")
    .select("id, order_number, subtotal, tax, tax_rate, total, discount_amount, discount_name, payment_method, status, customer_name, customer_id, cash_tendered, cash_change, refund_amount, refund_reason, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (startDate) {
    query = query.gte("created_at", `${startDate}T00:00:00`);
  }
  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59`);
  }
  if (search) {
    query = query.ilike("order_number", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o) => ({
    id: o.id,
    receipt_number: o.order_number,
    subtotal: o.subtotal,
    tax_amount: o.tax,
    tax_rate: o.tax_rate,
    total: o.total,
    discount_amount: o.discount_amount,
    discount_name: o.discount_name,
    payment_method: o.payment_method,
    status: o.status,
    customer_name: o.customer_name,
    customer_id: o.customer_id,
    cash_tendered: o.cash_tendered,
    cash_change: o.cash_change,
    refund_amount: o.refund_amount,
    refund_reason: o.refund_reason,
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
      tax_rate: body.tax_rate ?? 0.08,
      tax: body.tax_amount,
      total: body.total,
      discount_amount: body.discount_amount ?? 0,
      discount_name: body.discount_name ?? null,
      payment_method: body.payment_method,
      status: body.status ?? "completed",
      customer_name: body.customer_name ?? null,
      customer_id: body.customer_id ?? null,
      customer_email: body.customer_email ?? null,
      customer_phone: body.customer_phone ?? null,
      cash_tendered: body.cash_tendered ?? null,
      cash_change: body.cash_change ?? null,
      notes: body.notes ?? null,
      created_by: guard.context.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert line items if provided
  if (body.line_items?.length && order) {
    const items = body.line_items.map((li: { productId?: string; name: string; quantity: number; unitPrice: number; total: number; discount_amount?: number }) => ({
      order_id: order.id,
      product_id: li.productId || null,
      product_name: li.name,
      qty: li.quantity,
      unit_price: li.unitPrice,
      subtotal: li.total,
      discount_amount: li.discount_amount ?? 0,
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

    // Compute total cost of goods sold from line items
    let totalCost = 0;
    if (body.line_items?.length) {
      for (const li of body.line_items as Array<{ cost?: number; quantity: number }>) {
        if (li.cost && li.cost > 0) {
          totalCost += li.cost * li.quantity;
        }
      }
    }

    // Cross-module: create accounting journal entry for POS sale (with COGS)
    void createPosOrderJournalEntry(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      order.id as string,
      Number(order.total ?? 0),
      String(order.order_number ?? order.id),
      totalCost,
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
      tax_rate: order.tax_rate,
      total: order.total,
      discount_amount: order.discount_amount,
      payment_method: order.payment_method,
      status: order.status,
      customer_name: order.customer_name,
      cash_tendered: order.cash_tendered,
      cash_change: order.cash_change,
      created_at: order.created_at,
    },
  }, { status: 201 });
}
