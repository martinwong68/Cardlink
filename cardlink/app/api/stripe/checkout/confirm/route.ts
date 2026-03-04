import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

const toIsoFromUnix = (value?: number | null) => {
  if (!value) {
    return null;
  }
  return new Date(value * 1000).toISOString();
};

const getSubscriptionPeriodEndUnix = (subscription: Stripe.Subscription) => {
  const subscriptionItems = subscription.items?.data ?? [];
  const itemPeriodEnds = subscriptionItems
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (itemPeriodEnds.length > 0) {
    return Math.max(...itemPeriodEnds);
  }

  const subscriptionLike = subscription as unknown as {
    current_period_end?: unknown;
  };

  if (typeof subscriptionLike.current_period_end === "number") {
    return subscriptionLike.current_period_end;
  }

  const latestInvoice = subscription.latest_invoice;

  if (
    latestInvoice &&
    typeof latestInvoice !== "string" &&
    typeof latestInvoice.period_end === "number"
  ) {
    return latestInvoice.period_end;
  }

  if (typeof subscription.trial_end === "number") {
    return subscription.trial_end;
  }

  if (typeof subscription.cancel_at === "number") {
    return subscription.cancel_at;
  }

  return null;
};

const throwIfSupabaseError = (context: string, error: { message: string } | null) => {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string }
    | null;
  const sessionId = body?.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseServiceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Missing required environment variables" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const sessionReferenceUserId = session.client_reference_id ?? null;

    if (sessionReferenceUserId && sessionReferenceUserId !== user.id) {
      return NextResponse.json({ error: "Session does not belong to user" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    throwIfSupabaseError("load profile", profileError);

    if (
      profile?.stripe_customer_id &&
      sessionCustomerId &&
      profile.stripe_customer_id !== sessionCustomerId
    ) {
      return NextResponse.json({ error: "Customer mismatch" }, { status: 403 });
    }

    if (!profile?.stripe_customer_id && sessionCustomerId) {
      const { error: customerUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: sessionCustomerId })
        .eq("id", user.id);
      throwIfSupabaseError("save stripe_customer_id", customerUpdateError);
    }

    if (session.mode === "subscription" && session.subscription) {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const nextStripeStatus = subscription.status ?? null;
      const nextStripePeriodEnd =
        nextStripeStatus && ACTIVE_STRIPE_STATUSES.has(nextStripeStatus)
          ? toIsoFromUnix(getSubscriptionPeriodEndUnix(subscription))
          : null;

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: nextStripeStatus,
          stripe_subscription_current_period_end: nextStripePeriodEnd,
          last_payment_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      throwIfSupabaseError("update stripe subscription fields", profileUpdateError);

      const { error: recomputeError } = await supabaseAdmin.rpc("recompute_profile_premium", {
        p_user_id: user.id,
      });
      throwIfSupabaseError("recompute_profile_premium", recomputeError);
    } else {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ last_payment_at: new Date().toISOString() })
        .eq("id", user.id);
      throwIfSupabaseError("update last_payment_at", paymentUpdateError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[stripe-checkout-confirm] failed", {
      sessionId,
      userId: user.id,
      error,
    });
    return NextResponse.json({ error: "Failed to confirm checkout" }, { status: 500 });
  }
}
