import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createAdminClient } from "@/src/lib/supabase/admin";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

/**
 * POST /api/stripe/connect/checkout
 * Creates a Checkout Session that routes payment to a connected account.
 * The platform takes an application fee.
 *
 * Body:
 * - companyId: string (the connected account's company)
 * - amount: number (in dollars)
 * - currency?: string (default "usd")
 * - description: string
 * - successUrl?: string
 * - cancelUrl?: string
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);

  if (!body?.companyId || !body?.amount || !body?.description) {
    return NextResponse.json(
      { error: "Missing required fields: companyId, amount, description" },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  // Lookup the connected account for the target company
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", body.companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (!company.stripe_connect_account_id) {
    return NextResponse.json(
      { error: "This company has not connected a Stripe account yet." },
      { status: 400 },
    );
  }

  if (!company.stripe_connect_charges_enabled) {
    return NextResponse.json(
      { error: "This company's Stripe account is not yet ready to accept charges." },
      { status: 400 },
    );
  }

  const amountCents = Math.round(body.amount * 100);
  const currency = body.currency ?? "usd";
  const feePercent = parseFloat(
    process.env.STRIPE_CONNECT_PLATFORM_FEE_PERCENT ?? "10",
  );
  const applicationFee = Math.round(amountCents * (feePercent / 100));

  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: body.description },
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
    success_url:
      body.successUrl ?? `${origin}/business/settings/stripe-connect?payment=success`,
    cancel_url:
      body.cancelUrl ?? `${origin}/business/settings/stripe-connect?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
