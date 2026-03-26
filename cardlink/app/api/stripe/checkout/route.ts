import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/src/lib/supabase/server";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

type CheckoutBody = {
  planSlug?: string;
  interval?: "monthly" | "yearly";
  mode?: "subscription" | "payment";
  /** One-time payment: amount in dollars */
  amount?: number;
  /** One-time payment: item description */
  description?: string;
  /** For credit purchases: number of credits being purchased */
  credits?: number;
  /** For credit purchases: company the credits belong to */
  companyId?: string;
  /** Custom success URL (e.g. for registration flow) */
  successUrl?: string;
  /** Custom cancel URL */
  cancelUrl?: string;
} | null;

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as CheckoutBody;
    const interval = body?.interval ?? "monthly";
    const checkoutMode = body?.mode ?? "subscription";

    /* ── Build line_items from DB plan or one-time amount ── */
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (checkoutMode === "payment" && body?.amount && body?.description) {
      // One-time payment (e.g. NFC card, AI credits)
      const amountCents = Math.round(body.amount * 100);
      if (amountCents < 50) {
        return NextResponse.json({ error: "Amount too small" }, { status: 400 });
      }
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: { name: body.description },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ];
    } else {
      // Subscription — load plan from DB
      const planSlug = body?.planSlug ?? "professional";
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("name, slug, price_monthly, price_yearly")
        .eq("slug", planSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (planError || !plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 400 });
      }

      const priceAmount = interval === "yearly" ? plan.price_yearly : plan.price_monthly;
      if (!priceAmount || priceAmount <= 0) {
        return NextResponse.json({ error: "Invalid plan price" }, { status: 400 });
      }

      const amountCents = Math.round(priceAmount * 100);
      const recurringInterval = interval === "yearly" ? "year" : "month";

      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Cardlink ${plan.name}`,
              description: interval === "yearly"
                ? `${plan.name} plan — billed yearly`
                : `${plan.name} plan — billed monthly`,
            },
            unit_amount: amountCents,
            recurring: { interval: recurringInterval },
          },
          quantity: 1,
        },
      ];
    }

    /* ── Resolve or create Stripe customer ── */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      return NextResponse.json({ error: "Missing app URL" }, { status: 400 });
    }

    const defaultSuccessUrl = `${origin}/business/settings/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${origin}/business/settings/plan?checkout=cancelled`;

    // Allow custom return URLs (for registration flow) — only same-origin allowed
    let successUrl = defaultSuccessUrl;
    let cancelUrl = defaultCancelUrl;
    if (body?.successUrl && body.successUrl.startsWith(origin)) {
      successUrl = body.successUrl;
    }
    if (body?.cancelUrl && body.cancelUrl.startsWith(origin)) {
      cancelUrl = body.cancelUrl;
    }

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      customer: customerId,
      line_items: lineItems,
      client_reference_id: user.id,
      metadata: {
        plan_slug: body?.planSlug ?? "",
        interval: interval,
        credits: body?.credits ? String(body.credits) : "",
        company_id: body?.companyId ?? "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[stripe-checkout] failed", { userId: user.id, error: errMessage });
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
