"use client";

import { useEffect, useState, useCallback } from "react";

type PaymentOrder = { id: string; order_type: string; currency: string; total_amount: number; status: string; created_at: string };
type SubscriptionPlan = { id: string; name: string; slug: string; price_monthly: number; price_yearly: number; features: Record<string, unknown> };

const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", professional: "Professional", business: "Business" };
const PLAN_PRICES: Record<string, number> = { free: 0, starter: 20, professional: 40, business: 60 };

function statusColor(s: string) {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "pending" || s === "requires_action") return "bg-amber-100 text-amber-700";
  if (s === "failed" || s === "canceled") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-600";
}

function nextPlanSlug(currentPlan: string): string | null {
  if (currentPlan === "free") return "starter";
  if (currentPlan === "starter") return "professional";
  if (currentPlan === "professional") return "business";
  return null;
}

export default function OwnerBillingPage() {
  const [plan, setPlan] = useState("free");
  const [planStatus, setPlanStatus] = useState("active");
  const [stripeSubId, setStripeSubId] = useState<string | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [billingRes, ordersRes, plansRes] = await Promise.all([
        fetch("/api/owner/billing", { headers, cache: "no-store" }),
        fetch("/api/owner/payment-orders", { headers, cache: "no-store" }),
        fetch("/api/owner/billing/plans", { headers, cache: "no-store" }),
      ]);
      if (billingRes.ok) { const d = await billingRes.json(); setPlan(d.plan ?? "free"); setPlanStatus(d.plan_status ?? "active"); setStripeSubId(d.stripe_subscription_id ?? null); }
      if (ordersRes.ok) { const d = await ordersRes.json(); setOrders(d.orders ?? []); }
      if (plansRes.ok) { const d = await plansRes.json(); setPlans(d.plans ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (targetSlug: string) => {
    setUpgrading(targetSlug);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ planSlug: targetSlug, interval: billingInterval }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setUpgradeError((data as { error?: string }).error ?? "Failed to start checkout. Please check Stripe configuration.");
        setUpgrading(null);
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setUpgradeError("No checkout URL returned. Please check Stripe API keys.");
    } catch {
      setUpgradeError("Network error. Please try again.");
    }

    setUpgrading(null);
  };

  const isActive = planStatus === "active" || plan === "free";
  const currentPrice = PLAN_PRICES[plan] ?? 0;
  const upgrade = nextPlanSlug(plan);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading billing…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Current Plan</p>
            <p className="text-lg font-bold text-gray-900">{PLAN_LABELS[plan] ?? plan}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-purple-600">${currentPrice}<span className="text-xs font-normal text-gray-500">/ month</span></p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isActive ? "Active" : planStatus}</span>
          </div>
        </div>
        {stripeSubId && <p className="mt-2 text-xs text-gray-500">Subscription: {stripeSubId}</p>}
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setBillingInterval("monthly")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${billingInterval === "monthly" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >Monthly</button>
        <button
          onClick={() => setBillingInterval("yearly")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${billingInterval === "yearly" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >Yearly <span className="text-[10px] opacity-75">(Save ~17%)</span></button>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const price = billingInterval === "yearly" ? p.price_yearly : p.price_monthly;
          const isCurrent = p.slug === plan;
          const isUpgrade = !isCurrent && (PLAN_PRICES[p.slug] ?? 0) > currentPrice;

          return (
            <div key={p.id} className={`rounded-xl border p-4 ${isCurrent ? "border-purple-300 bg-purple-50" : "border-gray-100 bg-white"}`}>
              <p className="text-sm font-bold text-gray-900">{p.name}</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">
                ${billingInterval === "yearly" ? Math.round(price / 12) : price}
                <span className="text-xs font-normal text-gray-500">/ mo</span>
              </p>
              {billingInterval === "yearly" && (
                <p className="text-[10px] text-gray-400">${price}/year</p>
              )}
              {isCurrent ? (
                <span className="mt-3 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Current Plan</span>
              ) : isUpgrade ? (
                <button
                  onClick={() => void handleUpgrade(p.slug)}
                  disabled={upgrading !== null}
                  className="mt-3 w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {upgrading === p.slug ? "Redirecting…" : `Upgrade to ${p.name}`}
                </button>
              ) : (
                <span className="mt-3 inline-block text-xs text-gray-400">—</span>
              )}
            </div>
          );
        })}
      </div>

      {upgradeError && (
        <p className="text-xs text-red-600 text-center">{upgradeError}</p>
      )}

      {/* Quick upgrade shortcut when no plans loaded */}
      {plans.length === 0 && upgrade && (
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <button
            onClick={() => void handleUpgrade(upgrade)}
            disabled={upgrading !== null}
            className="w-full rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {upgrading ? "Redirecting to checkout…" : `Upgrade to ${PLAN_LABELS[upgrade] ?? upgrade}`}
          </button>
        </div>
      )}

      {/* Payment History */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Payment History</h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-400">No payment history yet.</p></div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.order_type === "membership" ? "Membership" : "Store"} — {o.currency} {(o.total_amount / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(o.status)}`}>{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
