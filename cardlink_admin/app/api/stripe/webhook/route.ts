import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
    apiVersion: "2026-01-28.clover",
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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const updatePlanByCustomer = async (
    customerId: string,
    plan: "premium" | "free"
  ) => {
    await supabaseAdmin
      .from("profiles")
      .update({ plan })
      .eq("stripe_customer_id", customerId);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string | null;
      if (customerId) {
        await updatePlanByCustomer(customerId, "premium");
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string | null;
      if (customerId) {
        await updatePlanByCustomer(customerId, "free");
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string | null;
      const status = subscription.status;
      if (customerId) {
        const nextPlan = status === "active" || status === "trialing" ? "premium" : "free";
        await updatePlanByCustomer(customerId, nextPlan);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
