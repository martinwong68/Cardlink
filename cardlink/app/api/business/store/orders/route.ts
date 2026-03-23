import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createBusinessNotificationServer } from "@/src/lib/business-notifications-server";
import { createStoreOrderJournalEntry } from "@/src/lib/cross-module-integration";

/* ── GET /api/business/store/orders — List store orders ──── */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const search = url.searchParams.get("search");
  const paymentStatus = url.searchParams.get("payment_status");

  const supabase = await createClient();
  let query = supabase
    .from("store_orders")
    .select("id, order_number, customer_name, customer_email, subtotal, discount_amount, discount_name, coupon_code, tax_amount, shipping_amount, total, status, payment_method, payment_status, shipping_method, tracking_number, notes, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (paymentStatus && paymentStatus !== "all") query = query.eq("payment_status", paymentStatus);
  if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);
  if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data ?? [] });
}

/* ── POST /api/business/store/orders — Create store order ── */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  // Generate order number
  const { data: orderNum } = await supabase.rpc("generate_store_order_number", {
    p_company_id: guard.context.activeCompanyId,
  });

  const orderNumber = (orderNum as string) || `SO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Calculate totals
  const lineItems: Array<{
    product_id?: string; variant_id?: string; name: string; variant_label?: string;
    sku?: string; qty: number; unit_price: number; discount_amount?: number; product_type?: string;
  }> = body.line_items ?? [];

  const subtotal = lineItems.reduce((sum, li) => sum + li.unit_price * li.qty - (li.discount_amount ?? 0), 0);
  const discountAmount = Number(body.discount_amount ?? 0);
  const taxRate = Number(body.tax_rate ?? 0);
  const taxAmount = Number(body.tax_amount ?? Math.round((subtotal - discountAmount) * taxRate * 100) / 100);
  const shippingAmount = Number(body.shipping_amount ?? 0);
  const total = subtotal - discountAmount + taxAmount + shippingAmount;

  const { data: order, error } = await supabase
    .from("store_orders")
    .insert({
      company_id: guard.context.activeCompanyId,
      order_number: orderNumber,
      customer_id: body.customer_id ?? null,
      customer_name: body.customer_name ?? null,
      customer_email: body.customer_email ?? null,
      customer_phone: body.customer_phone ?? null,
      subtotal,
      discount_amount: discountAmount,
      discount_name: body.discount_name ?? null,
      coupon_code: body.coupon_code ?? null,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      shipping_amount: shippingAmount,
      total,
      status: body.status ?? "pending",
      payment_method: body.payment_method ?? null,
      payment_status: body.payment_status ?? "unpaid",
      paid_at: body.payment_status === "paid" ? new Date().toISOString() : null,
      shipping_address: body.shipping_address ?? null,
      shipping_method: body.shipping_method ?? null,
      notes: body.notes ?? null,
      internal_notes: body.internal_notes ?? null,
      created_by: guard.context.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert line items
  if (lineItems.length > 0 && order) {
    const items = lineItems.map((li) => ({
      order_id: order.id,
      product_id: li.product_id || null,
      variant_id: li.variant_id || null,
      product_name: li.name,
      variant_label: li.variant_label || null,
      sku: li.sku || null,
      qty: li.qty,
      unit_price: li.unit_price,
      discount_amount: li.discount_amount ?? 0,
      subtotal: li.unit_price * li.qty - (li.discount_amount ?? 0),
      product_type: li.product_type ?? "physical",
    }));
    await supabase.from("store_order_items").insert(items);
  }

  // Cross-module: accounting journal entry
  if (order && total > 0) {
    void createStoreOrderJournalEntry(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      order.id as string,
      total,
      orderNumber,
    );
  }

  // Cross-module: deduct inventory for physical items
  if (order && lineItems.length > 0) {
    for (const li of lineItems) {
      if (li.product_id && li.qty > 0 && (li.product_type ?? "physical") === "physical") {
        // Deduct store product stock
        await supabase.rpc("record_inventory_movement", {
          p_company_id: guard.context.activeCompanyId,
          p_product_id: li.product_id,
          p_movement_type: "out",
          p_qty: li.qty,
          p_reason: `Store order: ${orderNumber}`,
          p_reference_type: "store_order",
          p_reference_id: order.id,
          p_created_by: guard.context.user.id,
          p_idempotency_key: `store-inv-${order.id}-${li.product_id}`,
          p_operation_id: null,
          p_correlation_id: null,
          p_occurred_at: null,
        });
        // Inventory module may not be enabled — errors are silent

        // Also decrement store_products.stock_quantity directly
        const { data: prod } = await supabase
          .from("store_products")
          .select("stock_quantity")
          .eq("id", li.product_id)
          .single();
        if (prod && prod.stock_quantity != null) {
          await supabase
            .from("store_products")
            .update({ stock_quantity: Math.max(0, (prod.stock_quantity as number) - li.qty) })
            .eq("id", li.product_id);
        }
      }
    }
  }

  // Notify
  if (order) {
    void createBusinessNotificationServer(supabase, guard.context.activeCompanyId, guard.context.user.id, {
      type: "new_order",
      title: `New store order ${orderNumber}`,
      body: `$${total.toFixed(2)} — ${lineItems.length} item(s)`,
      priority: "normal",
      related_module: "store",
      related_entity_id: order.id as string,
    });
  }

  // Increment coupon usage
  if (body.coupon_code && order) {
    // Fetch current usage count and increment
    const { data: couponRow } = await supabase
      .from("store_coupons")
      .select("id, usage_count")
      .eq("company_id", guard.context.activeCompanyId)
      .eq("code", String(body.coupon_code).toUpperCase().trim())
      .single();

    if (couponRow) {
      await supabase
        .from("store_coupons")
        .update({ usage_count: ((couponRow.usage_count as number) ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", couponRow.id);
    }
  }

  return NextResponse.json({ order }, { status: 201 });
}
