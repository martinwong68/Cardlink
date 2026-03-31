import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

/**
 * POST /api/public/store/stripe-checkout
 * Creates a Stripe Checkout Session for a store order.
 * Routes payment to the company's Stripe Connect account.
 * No auth required (public endpoint).
 *
 * Body:
 * - company_id: string
 * - order_id: string (the store order to pay for)
 * - success_url?: string
 * - cancel_url?: string
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.company_id || !body?.order_id) {
    return NextResponse.json(
      { error: "Missing required fields: company_id, order_id" },
      { status: 400 },
    );
  }

  const companyId = body.company_id as string;
  const orderId = body.order_id as string;

  const supabaseAdmin = createAdminClient();

  // Lookup connected Stripe account for the company
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled, name")
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (!company.stripe_connect_account_id) {
    return NextResponse.json(
      { error: "This store does not accept online payments at this time." },
      { status: 400 },
    );
  }

  if (!company.stripe_connect_charges_enabled) {
    return NextResponse.json(
      { error: "This store's payment processing is not yet ready." },
      { status: 400 },
    );
  }

  // Load the order
  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("store_orders")
    .select("id, order_number, total, payment_status, status, customer_email")
    .eq("id", orderId)
    .eq("company_id", companyId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
  }

  const amountCents = Math.round(Number(order.total) * 100);
  if (amountCents < 50) {
    return NextResponse.json({ error: "Order amount too small for card payment" }, { status: 400 });
  }

  const feePercent = parseFloat(process.env.STRIPE_CONNECT_PLATFORM_FEE_PERCENT ?? "10");
  const applicationFee = Math.round(amountCents * (feePercent / 100));

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Order ${order.order_number}`,
            description: `${company.name} — Store Order`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: company.stripe_connect_account_id,
      },
    },
    customer_email: order.customer_email || undefined,
    metadata: {
      store_order_id: orderId,
      company_id: companyId,
    },
    success_url: body.success_url ?? `${origin}/store/${companyId}?payment=success&order=${orderId}`,
    cancel_url: body.cancel_url ?? `${origin}/store/${companyId}?payment=cancelled&order=${orderId}`,
  });

  // Update the order with the Stripe session ID
  await supabase
    .from("store_orders")
    .update({
      payment_method: "stripe",
      payment_status: "pending",
      notes: `Stripe session: ${session.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
