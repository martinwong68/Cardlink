import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * PATCH /api/public/store/orders/[id] — Public order update (limited)
 *
 * Allows cancelling a pending store order from the public storefront.
 * Only status=cancelled is allowed, and only for orders with payment_status=unpaid or pending.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Only allow cancellation
  if (body.status !== "cancelled") {
    return NextResponse.json({ error: "Only cancellation is allowed." }, { status: 400 });
  }

  // Fetch the order — must be pending and unpaid/pending payment
  const { data: order, error: fetchErr } = await supabase
    .from("store_orders")
    .select("id, status, payment_status")
    .eq("id", id)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Only allow cancelling pending orders that haven't been paid
  if (!["pending"].includes(order.status as string)) {
    return NextResponse.json({ error: "Only pending orders can be cancelled." }, { status: 400 });
  }

  if (["paid"].includes(order.payment_status as string)) {
    return NextResponse.json({ error: "Cannot cancel a paid order." }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("store_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
