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
 * POST /api/stripe/connect/dashboard
 * Returns a Stripe Express dashboard login link for the connected account.
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

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("stripe_connect_account_id")
    .eq("id", activeCompanyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const accountId = company.stripe_connect_account_id;

  if (!accountId) {
    return NextResponse.json(
      { error: "No connected Stripe account found. Please complete onboarding first." },
      { status: 400 },
    );
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId);

  return NextResponse.json({ url: loginLink.url });
}
