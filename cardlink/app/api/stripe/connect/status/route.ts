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
 * GET /api/stripe/connect/status
 * Returns the current Stripe Connect status for the active company.
 */
export async function GET(request: Request) {
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

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select(
      "stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled",
    )
    .eq("id", activeCompanyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const accountId = company.stripe_connect_account_id;

  // No connected account yet
  if (!accountId) {
    return NextResponse.json({
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
      requiresAction: false,
    });
  }

  // Fetch latest status from Stripe
  const account = await stripe.accounts.retrieve(accountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;

  // Sync back to DB if changed
  if (
    chargesEnabled !== company.stripe_connect_charges_enabled ||
    payoutsEnabled !== company.stripe_connect_payouts_enabled ||
    detailsSubmitted !== company.stripe_connect_onboarding_complete
  ) {
    await supabaseAdmin
      .from("companies")
      .update({
        stripe_connect_charges_enabled: chargesEnabled,
        stripe_connect_payouts_enabled: payoutsEnabled,
        stripe_connect_onboarding_complete: detailsSubmitted,
      })
      .eq("id", activeCompanyId);
  }

  return NextResponse.json({
    connected: true,
    accountId,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete: detailsSubmitted,
    requiresAction:
      !chargesEnabled || !payoutsEnabled || !detailsSubmitted,
  });
}
