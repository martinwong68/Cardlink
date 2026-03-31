import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * POST /api/public/store/checkout — Public checkout endpoint
 *
 * Creates a store order from a public cart. No auth required.
 * Requires company_id in the body.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const companyId = body.company_id as string;

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify store is published
  const { data: settings } = await supabase
    .from("store_settings")
    .select("is_published")
    .eq("company_id", companyId)
    .single();

  if (!settings?.is_published) {
    return NextResponse.json({ error: "Store is not available" }, { status: 404 });
  }

  // Validate line items
  const lineItems: Array<{
    product_id: string; variant_id?: string; qty: number;
  }> = body.line_items ?? [];

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Fetch product details and validate stock
  const productIds = [...new Set(lineItems.map((li) => li.product_id))];
  const { data: products } = await supabase
    .from("store_products")
    .select("id, name, price, compare_at_price, stock_quantity, product_type, is_active, sku")
    .in("id", productIds)
    .eq("company_id", companyId);

  if (!products || products.length === 0) {
    return NextResponse.json({ error: "Products not found" }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const resolvedItems: Array<{
    product_id: string; variant_id: string | null; name: string;
    sku: string | null; qty: number; unit_price: number; subtotal: number; product_type: string;
  }> = [];

  for (const li of lineItems) {
    const product = productMap.get(li.product_id);
    if (!product || !product.is_active) {
      return NextResponse.json({ error: `Product ${li.product_id} is not available` }, { status: 400 });
    }

    // Check stock for physical products
    if (product.product_type === "physical" && product.stock_quantity != null) {
      if ((product.stock_quantity as number) < li.qty) {
        return NextResponse.json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`,
        }, { status: 400 });
      }
    }

    const unitPrice = Number(product.price);
    resolvedItems.push({
      product_id: li.product_id,
      variant_id: li.variant_id ?? null,
      name: product.name as string,
      sku: (product.sku as string) ?? null,
      qty: li.qty,
      unit_price: unitPrice,
      subtotal: unitPrice * li.qty,
      product_type: product.product_type as string,
    });
  }

  // Calculate totals
  const subtotal = resolvedItems.reduce((s, i) => s + i.subtotal, 0);

  // Apply coupon if provided
  let discountAmount = 0;
  let discountName: string | null = null;
  const couponCode = body.coupon_code as string | undefined;

  if (couponCode) {
    const { data: coupon } = await supabase
      .from("store_coupons")
      .select("*")
      .eq("company_id", companyId)
      .eq("code", couponCode.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (coupon) {
      const now = new Date();
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from as string) : null;
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until as string) : null;

      const isValid =
        (!validFrom || now >= validFrom) &&
        (!validUntil || now <= validUntil) &&
        (coupon.usage_limit == null || (coupon.usage_count as number) < (coupon.usage_limit as number)) &&
        subtotal >= Number(coupon.min_order_amount ?? 0);

      if (isValid) {
        if (coupon.discount_type === "percentage") {
          discountAmount = Math.round(subtotal * Number(coupon.discount_value) / 100 * 100) / 100;
          if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
            discountAmount = Number(coupon.max_discount);
          }
        } else {
          discountAmount = Math.min(Number(coupon.discount_value), subtotal);
        }
        discountName = (coupon.name as string) ?? couponCode;

        // Increment usage
        await supabase
          .from("store_coupons")
          .update({ usage_count: (coupon.usage_count as number) + 1, updated_at: new Date().toISOString() })
          .eq("id", coupon.id);
      }
    }
  }

  // Tax
  const taxRate = Number(body.tax_rate ?? 0);
  const taxAmount = Math.round((subtotal - discountAmount) * taxRate * 100) / 100;

  // Shipping
  const shippingAmount = Number(body.shipping_amount ?? 0);
  const total = subtotal - discountAmount + taxAmount + shippingAmount;

  // Generate order number
  const { data: orderNum } = await supabase.rpc("generate_store_order_number", {
    p_company_id: companyId,
  });
  const orderNumber = (orderNum as string) || `SO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Find or create customer
  let customerId: string | null = null;
  if (body.customer_email || body.customer_name) {
    if (body.customer_email) {
      const { data: existing } = await supabase
        .from("store_customers")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", body.customer_email)
        .maybeSingle();

      if (existing) {
        customerId = existing.id as string;
      }
    }

    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from("store_customers")
        .insert({
          company_id: companyId,
          name: body.customer_name ?? body.customer_email ?? "Guest",
          email: body.customer_email ?? null,
          phone: body.customer_phone ?? null,
          addresses: body.shipping_address ? [{ ...body.shipping_address, is_default: true }] : [],
        })
        .select("id")
        .single();

      if (newCustomer) customerId = newCustomer.id as string;
    }
  }

  // Create order
  const { data: order, error } = await supabase
    .from("store_orders")
    .insert({
      company_id: companyId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: body.customer_name ?? null,
      customer_email: body.customer_email ?? null,
      customer_phone: body.customer_phone ?? null,
      subtotal,
      discount_amount: discountAmount,
      discount_name: discountName,
      coupon_code: couponCode?.toUpperCase().trim() ?? null,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      shipping_amount: shippingAmount,
      total,
      status: "pending",
      payment_method: body.payment_method ?? null,
      payment_status: body.payment_method === "cash" ? "paid" : "unpaid",
      paid_at: body.payment_method === "cash" ? new Date().toISOString() : null,
      shipping_address: body.shipping_address ?? null,
      shipping_method: body.shipping_method ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert line items
  if (order) {
    const items = resolvedItems.map((li) => ({
      order_id: order.id,
      product_id: li.product_id,
      variant_id: li.variant_id,
      product_name: li.name,
      sku: li.sku,
      qty: li.qty,
      unit_price: li.unit_price,
      subtotal: li.subtotal,
      product_type: li.product_type,
    }));
    await supabase.from("store_order_items").insert(items);

    // Deduct stock
    for (const li of resolvedItems) {
      if (li.product_type === "physical" && li.qty > 0) {
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

  return NextResponse.json({
    order: {
      id: order?.id,
      order_number: orderNumber,
      total,
      status: "pending",
      payment_status: body.payment_method ? "paid" : "unpaid",
    },
  }, { status: 201 });
}
