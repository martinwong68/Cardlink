import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();

  /* Fetch payment events from billing_payment_events for this user */
  const { data: events, error } = await supabase
    .from("billing_payment_events")
    .select("id, event_type, mode, payment_status, amount_total, currency, created_at")
    .eq("user_id", guard.context.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* Map to a UI-friendly format */
  const orders = (events ?? []).map((e) => ({
    id: e.id,
    order_type: e.mode ?? e.event_type ?? "payment",
    currency: e.currency ?? "usd",
    total_amount: (e.amount_total ?? 0) / 100, // Stripe amounts in cents
    status: e.payment_status ?? "unknown",
    created_at: e.created_at,
  }));

  return NextResponse.json({ orders });
}
