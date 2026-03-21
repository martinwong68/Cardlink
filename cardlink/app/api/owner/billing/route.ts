import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();

  /* Current plan from profiles */
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id, stripe_subscription_status, stripe_subscription_current_period_end, premium_until, last_payment_at")
    .eq("id", guard.context.user.id)
    .maybeSingle();

  /* Company subscription if any */
  const { data: companySub } = await supabase
    .from("company_subscriptions")
    .select("plan_id, status, current_period_start, current_period_end")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("status", "active")
    .maybeSingle();

  const plan = profile?.plan ?? "free";
  const planStatus = profile?.stripe_subscription_status ?? (plan === "free" ? "active" : "inactive");

  return NextResponse.json({
    plan,
    plan_status: planStatus,
    stripe_subscription_id: profile?.stripe_subscription_id ?? null,
    premium_until: profile?.premium_until ?? null,
    last_payment_at: profile?.last_payment_at ?? null,
    company_subscription: companySub ?? null,
  });
}
