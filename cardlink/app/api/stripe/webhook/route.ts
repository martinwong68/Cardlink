import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const ACTIVE_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

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

const getInvoiceSubscriptionId = (invoice: Stripe.Invoice) => {
  const value = invoice.parent?.subscription_details?.subscription;
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
};

const getInvoicePaymentIntentId = (invoice: Stripe.Invoice) => {
  const value = invoice.payments?.data?.[0]?.payment.payment_intent;
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
};

const throwIfSupabaseError = (context: string, error: { message: string } | null) => {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
};

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!stripeSecretKey || !webhookSecret || !supabaseServiceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Missing required environment variables" },
      { status: 500 }
    );
  }

  const webhookSecretValue = webhookSecret as string;

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-02-25.clover",
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecretValue);
  } catch (error) {
    console.error("[stripe-webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const recomputeByCustomer = async (customerId: string) => {
    const { data: profileRows, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId);
    throwIfSupabaseError("load profiles by stripe_customer_id", error);

    if (!profileRows || profileRows.length === 0) {
      console.warn("[stripe-webhook] no profile matched stripe customer", {
        customerId,
      });
      return;
    }

    for (const profile of profileRows ?? []) {
      const { error: recomputeError } = await supabaseAdmin.rpc("recompute_profile_premium", {
        p_user_id: profile.id,
      });
      throwIfSupabaseError("recompute_profile_premium", recomputeError);
    }
  };

  const syncSubscriptionByCustomer = async (params: {
    customerId: string;
    subscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionCurrentPeriodEnd?: number | null;
    touchLastPaymentAt?: boolean;
  }) => {
    const {
      customerId,
      subscriptionId,
      subscriptionStatus,
      subscriptionCurrentPeriodEnd,
      touchLastPaymentAt,
    } = params;

    const nextStripeStatus = subscriptionStatus ?? null;
    const nextStripePeriodEnd =
      nextStripeStatus && ACTIVE_STRIPE_STATUSES.has(nextStripeStatus)
        ? toIsoFromUnix(subscriptionCurrentPeriodEnd)
        : null;

    const payload: Record<string, string | null> = {
      stripe_subscription_id: subscriptionId ?? null,
      stripe_subscription_status: nextStripeStatus,
      stripe_subscription_current_period_end: nextStripePeriodEnd,
    };

    if (touchLastPaymentAt) {
      payload.last_payment_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("stripe_customer_id", customerId);
    throwIfSupabaseError("update profile stripe subscription fields", error);

    await recomputeByCustomer(customerId);
  };

  const getUserIdByCustomer = async (customerId: string) => {
    const { data: profileRow, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    throwIfSupabaseError("get user id by stripe customer", error);
    return profileRow?.id ?? null;
  };

  const saveBillingEvent = async (params: {
    stripeEventId: string;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    userId?: string | null;
    eventType: string;
    mode?: string | null;
    paymentStatus?: string | null;
    amountTotal?: number | null;
    currency?: string | null;
    raw: unknown;
  }) => {
    const { error } = await supabaseAdmin.from("billing_payment_events").upsert(
      {
        stripe_event_id: params.stripeEventId,
        stripe_checkout_session_id: params.stripeCheckoutSessionId ?? null,
        stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
        stripe_subscription_id: params.stripeSubscriptionId ?? null,
        stripe_customer_id: params.stripeCustomerId ?? null,
        user_id: params.userId ?? null,
        event_type: params.eventType,
        mode: params.mode ?? null,
        payment_status: params.paymentStatus ?? null,
        amount_total: params.amountTotal ?? null,
        currency: params.currency ?? null,
        raw: params.raw,
      },
      { onConflict: "stripe_event_id" }
    );
    throwIfSupabaseError("upsert billing_payment_events", error);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        const clientReferenceUserId = session.client_reference_id ?? null;
        const resolvedUserId =
          clientReferenceUserId ??
          (customerId ? await getUserIdByCustomer(customerId) : null);

        await saveBillingEvent({
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          userId: resolvedUserId,
          eventType: event.type,
          mode: session.mode,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          raw: event.data.object,
        });

        if (customerId) {
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            );
            await syncSubscriptionByCustomer({
              customerId,
              subscriptionId,
              subscriptionStatus: subscription.status,
              subscriptionCurrentPeriodEnd:
                getSubscriptionPeriodEndUnix(subscription),
              touchLastPaymentAt: true,
            });
          } else {
            const { error: updateError } = await supabaseAdmin
              .from("profiles")
              .update({ last_payment_at: new Date().toISOString() })
              .eq("stripe_customer_id", customerId);
            throwIfSupabaseError("update last_payment_at", updateError);
          }

          // Save actual plan slug from checkout metadata
          const planSlug = session.metadata?.plan_slug;
          if (planSlug) {
            const { error: planError } = await supabaseAdmin
              .from("profiles")
              .update({ plan: planSlug })
              .eq("stripe_customer_id", customerId);
            if (planError) {
              console.error("[stripe-webhook] failed to update plan slug", planError);
            }
          }

          // Activate any pending company subscriptions for this user
          const userId = await getUserIdByCustomer(customerId);
          if (userId) {
            const { data: activeCompany } = await supabaseAdmin
              .from("profiles")
              .select("business_active_company_id")
              .eq("id", userId)
              .maybeSingle();
            if (activeCompany?.business_active_company_id) {
              const { error: subActivateError } = await supabaseAdmin
                .from("company_subscriptions")
                .update({ status: "active" })
                .eq("company_id", activeCompany.business_active_company_id)
                .eq("status", "pending");
              if (subActivateError) {
                console.error("[stripe-webhook] failed to activate company subscription", subActivateError);
              }
            }
          }
        }

        // ── Handle store order payments via Stripe Connect ──
        const storeOrderId = session.metadata?.store_order_id;
        const storeCompanyId = session.metadata?.company_id;
        if (storeOrderId && storeCompanyId && session.payment_status === "paid") {
          const { error: storeOrderError } = await supabaseAdmin
            .from("store_orders")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", storeOrderId)
            .eq("company_id", storeCompanyId);
          if (storeOrderError) {
            console.error("[stripe-webhook] failed to mark store order paid", storeOrderError);
          }
        }

        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        const resolvedUserId =
          customerId ? await getUserIdByCustomer(customerId) : null;

        await saveBillingEvent({
          stripeEventId: event.id,
          stripePaymentIntentId: getInvoicePaymentIntentId(invoice),
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          userId: resolvedUserId,
          eventType: event.type,
          mode: "subscription",
          paymentStatus: invoice.status,
          amountTotal: invoice.amount_paid,
          currency: invoice.currency,
          raw: event.data.object,
        });

        if (customerId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionByCustomer({
            customerId,
            subscriptionId,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: getSubscriptionPeriodEndUnix(subscription),
            touchLastPaymentAt: true,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string | null;

        if (customerId) {
          await syncSubscriptionByCustomer({
            customerId,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: getSubscriptionPeriodEndUnix(subscription),
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string | null;

        if (customerId) {
          await syncSubscriptionByCustomer({
            customerId,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: null,
          });
        }
        break;
      }
      /* ── Stripe Connect: account.updated ── */
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const connectAccountId = account.id;

        // Update company record when connected account status changes
        const { data: companyRow, error: companyLookupError } =
          await supabaseAdmin
            .from("companies")
            .select("id")
            .eq("stripe_connect_account_id", connectAccountId)
            .maybeSingle();

        if (!companyLookupError && companyRow) {
          const { error: companyUpdateError } = await supabaseAdmin
            .from("companies")
            .update({
              stripe_connect_charges_enabled:
                account.charges_enabled ?? false,
              stripe_connect_payouts_enabled:
                account.payouts_enabled ?? false,
              stripe_connect_onboarding_complete:
                account.details_submitted ?? false,
            })
            .eq("id", companyRow.id);
          if (companyUpdateError) {
            console.error(
              "[stripe-webhook] failed to update company connect status",
              companyUpdateError,
            );
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe-webhook] processing failed", {
      eventType: event.type,
      eventId: event.id,
      error,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
