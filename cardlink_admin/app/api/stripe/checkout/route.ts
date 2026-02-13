import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/src/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { priceId?: string; interval?: "monthly" | "yearly" }
    | null;

  const interval = body?.interval ?? "monthly";
  const subscriptionPriceId =
    interval === "yearly"
      ? process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID
      : process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;

  const selectedPriceId = body?.priceId ?? subscriptionPriceId;
  const checkoutMode = body?.priceId ? "payment" : "subscription";

  if (!selectedPriceId) {
    return NextResponse.json(
      { error: "Missing priceId" },
      { status: 400 }
    );
  }

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
      metadata: {
        supabase_user_id: user.id,
      },
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
    return NextResponse.json(
      { error: "Missing app URL" },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: checkoutMode,
    customer: customerId,
    line_items: [{ price: selectedPriceId, quantity: 1 }],
    client_reference_id: user.id,
    success_url: `${origin}/dashboard/settings/upgrade/success`,
    cancel_url: `${origin}/dashboard/settings/upgrade`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
