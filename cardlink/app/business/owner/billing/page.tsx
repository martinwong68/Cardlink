"use client";

import { useEffect, useState, useCallback } from "react";

type PaymentOrder = { id: string; order_type: string; currency: string; total_amount: number; status: string; created_at: string };

const PLAN_PRICES: Record<string, string> = { free: "$0", pro: "$29", enterprise: "$99" };
const PLAN_LABELS: Record<string, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

function statusColor(s: string) {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "pending" || s === "requires_action") return "bg-amber-100 text-amber-700";
  if (s === "failed" || s === "canceled") return "bg-rose-100 text-rose-700";
  return "bg-neutral-100 text-neutral-600";
}

export default function OwnerBillingPage() {
  const [plan, setPlan] = useState("free");
  const [planStatus, setPlanStatus] = useState("active");
  const [stripeSubId, setStripeSubId] = useState<string | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [billingRes, ordersRes] = await Promise.all([
        fetch("/api/owner/billing", { headers, cache: "no-store" }),
        fetch("/api/owner/payment-orders", { headers, cache: "no-store" }),
      ]);
      if (billingRes.ok) { const d = await billingRes.json(); setPlan(d.plan ?? "free"); setPlanStatus(d.plan_status ?? "active"); setStripeSubId(d.stripe_subscription_id ?? null); }
      if (ordersRes.ok) { const d = await ordersRes.json(); setOrders(d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isActive = planStatus === "active" || plan === "free";

  const features = [
    { label: "Employee cards", included: true },
    { label: "Store items", included: true },
    { label: "Members", included: true },
    { label: "Team members", included: true },
    { label: "Analytics", included: plan !== "free" },
    { label: "API access", included: plan !== "free" },
    { label: "Custom domain", included: plan === "enterprise" },
    { label: "Priority support", included: plan === "enterprise" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading billing…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-neutral-900">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Current Plan</p>
            <p className="text-lg font-bold text-neutral-900">{PLAN_LABELS[plan] ?? plan}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-purple-600">{PLAN_PRICES[plan] ?? "$?"}<span className="text-xs font-normal text-neutral-500">/ month</span></p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isActive ? "Active" : planStatus}</span>
          </div>
        </div>
        {stripeSubId && <p className="mt-2 text-xs text-neutral-500">Subscription: {stripeSubId}</p>}
      </div>

      {/* Plan Features */}
      <div className="rounded-xl border border-neutral-100 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Plan Features</h2>
        <div className="space-y-1">
          {features.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className={f.included ? "text-green-500" : "text-neutral-400"}>{f.included ? "✓" : "—"}</span>
              <span className={`text-xs ${f.included ? "text-neutral-900" : "text-neutral-400"}`}>{f.label}</span>
            </div>
          ))}
        </div>
        {plan !== "enterprise" && (
          <button className="mt-3 w-full rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700">
            Upgrade to {plan === "free" ? "Pro" : "Enterprise"}
          </button>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Payment History</h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-neutral-100 bg-white p-4"><p className="text-xs text-neutral-400">No payment history yet.</p></div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{o.order_type === "membership" ? "Membership" : "Store"} — {o.currency} {(o.total_amount / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</p>
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
