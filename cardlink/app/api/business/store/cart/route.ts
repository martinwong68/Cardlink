import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim() || null;
  const customerId = url.searchParams.get("customer_id")?.trim() || null;

  if (!sessionId && !customerId) {
    return NextResponse.json(
      { error: "session_id or customer_id query param is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let cartQuery = supabase
    .from("store_carts")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("status", "active");

  if (sessionId) cartQuery = cartQuery.eq("session_id", sessionId);
  if (customerId) cartQuery = cartQuery.eq("customer_id", customerId);

  const { data: cart, error: cartError } = await cartQuery.maybeSingle();

  if (cartError) return NextResponse.json({ error: cartError.message }, { status: 500 });
  if (!cart) {
    return NextResponse.json({
      contract: "store.cart.v1",
      status: "ok",
      company_id: guard.context.activeCompanyId,
      cart: null,
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("store_cart_items")
    .select("*, product:product_id(id, name, sku, image_url)")
    .eq("cart_id", cart.id);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({
    contract: "store.cart.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    cart: { ...cart, items: items ?? [] },
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const sessionId = body.session_id?.trim() || null;
  const customerId = body.customer_id?.trim() || null;

  if (!sessionId && !customerId) {
    return NextResponse.json(
      { error: "session_id or customer_id is required." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items array is required with at least one entry." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Look for an existing active cart
  let existingQuery = supabase
    .from("store_carts")
    .select("id")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("status", "active");

  if (sessionId) existingQuery = existingQuery.eq("session_id", sessionId);
  if (customerId) existingQuery = existingQuery.eq("customer_id", customerId);

  const { data: existing } = await existingQuery.maybeSingle();

  // Calculate totals
  const itemRows = body.items.map(
    (i: { product_id: string; variant_id?: string; quantity: number; unit_price: number }) => ({
      product_id: i.product_id,
      variant_id: i.variant_id || null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }),
  );
  const subtotal = itemRows.reduce(
    (sum: number, i: { total_price: number }) => sum + i.total_price,
    0,
  );
  const total = subtotal;

  let cartId: string;

  if (existing) {
    // Update existing cart — remove old items, replace with new
    cartId = existing.id;
    const { error: delErr } = await supabase
      .from("store_cart_items")
      .delete()
      .eq("cart_id", cartId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const { error: updErr } = await supabase
      .from("store_carts")
      .update({
        subtotal,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  } else {
    // Create new cart
    const { data: cart, error: cartErr } = await supabase
      .from("store_carts")
      .insert({
        company_id: guard.context.activeCompanyId,
        session_id: sessionId,
        customer_id: customerId,
        status: "active",
        subtotal,
        total,
      })
      .select("id")
      .single();

    if (cartErr) {
      const conflict = cartErr.code === "23505";
      return NextResponse.json({ error: cartErr.message }, { status: conflict ? 409 : 400 });
    }
    cartId = cart.id;
  }

  // Insert items
  const rows = itemRows.map(
    (i: { product_id: string; variant_id: string | null; quantity: number; unit_price: number; total_price: number }) => ({
      cart_id: cartId,
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }),
  );

  const { error: insErr } = await supabase.from("store_cart_items").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json(
    {
      contract: "store.cart.v1",
      status: existing ? "updated" : "created",
      company_id: guard.context.activeCompanyId,
      cart_id: cartId,
      item_count: itemRows.length,
      total,
    },
    { status: existing ? 200 : 201 },
  );
}
