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
 * POST /api/stripe/connect/onboard
 * Creates a Stripe Express connected account (or re-uses existing) and
 * returns an Account Link URL for the onboarding flow.
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

  const { activeCompanyId } = guard.context;
  const supabaseAdmin = createAdminClient();

  // Fetch current company record
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, name, stripe_connect_account_id, contact_email")
    .eq("id", activeCompanyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let accountId = company.stripe_connect_account_id;

  // Create a new Express connected account if one doesn't exist
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: company.contact_email || undefined,
      business_profile: {
        name: company.name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    // Save the connected account ID to the company
    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", activeCompanyId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save connected account" },
        { status: 500 },
      );
    }
  }

  // Create an Account Link for onboarding
  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/business/settings/stripe-connect?refresh=true`,
    return_url: `${origin}/business/settings/stripe-connect?onboarding=complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url }, { status: 200 });
}
