"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Zap,
  HardDrive,
  Building2,
  Users,
  ScanLine,
  Check,
  Crown,
  Rocket,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { useActiveCompany } from "@/components/business/useActiveCompany";

/* ── Types ── */
type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  ai_actions_monthly: number;
  max_companies: number;
  max_users: number;
  storage_mb: number;
  pdf_export: boolean;
  document_ocr_monthly: number;
  features: Record<string, unknown>;
  sort_order: number;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  ai_actions_used: number;
  ai_actions_limit: number;
  storage_used_mb: number;
  storage_limit_mb: number;
};

type BillingRow = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: string;
  created_at: string;
};

const PLAN_ICONS: Record<string, typeof Rocket> = {
  free: Rocket,
  professional: Zap,
  business: Crown,
};

const PLAN_COLORS: Record<string, { ring: string; bg: string; icon: string }> = {
  free: { ring: "ring-gray-200", bg: "bg-gray-50", icon: "text-gray-500" },
  professional: { ring: "ring-indigo-300", bg: "bg-indigo-50", icon: "text-indigo-600" },
  business: { ring: "ring-amber-300", bg: "bg-amber-50", icon: "text-amber-600" },
};

const CREDIT_OPTIONS = [
  { credits: 100, price: 5, label: "100 credits", save: null },
  { credits: 500, price: 20, label: "500 credits", save: "20%" },
  { credits: 2000, price: 60, label: "2,000 credits", save: "40%" },
];

/* ── Usage Meter ── */
function UsageMeter({
  label,
  used,
  limit,
  icon: Icon,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  icon: typeof Zap;
  unit?: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-amber-500" : "bg-red-500";
  const displayUsed = unit === "GB" ? (used / 1024).toFixed(1) : used;
  const displayLimit = unit === "GB" ? (limit / 1024).toFixed(0) : limit;
  const suffix = unit ? ` ${unit}` : "";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          {label}
        </span>
        <span className="text-gray-500">
          {displayUsed}{suffix} / {displayLimit}{suffix}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PlanBillingSettingsPage() {
  const t = useTranslations("planBilling");
  const tOverview = useTranslations("businessSettingsOverview");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [purchasingCredits, setPurchasingCredits] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;

    const [
      { data: plansData },
      { data: subData },
      { data: billingData },
      { count: members },
      { data: credits },
    ] = await Promise.all([
      supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("company_subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("billing_history")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("company_members")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId),
      supabase
        .from("ai_credits")
        .select("credits_remaining")
        .eq("company_id", companyId)
        .gt("credits_remaining", 0),
    ]);

    setPlans((plansData as Plan[]) ?? []);
    setSubscription((subData as Subscription) ?? null);
    setBilling((billingData as BillingRow[]) ?? []);
    setMemberCount(members ?? 0);

    const totalCr = (credits ?? []).reduce(
      (sum: number, c: { credits_remaining: number }) => sum + c.credits_remaining,
      0,
    );
    setTotalCredits(totalCr);

    // Resolve current plan
    if (subData && plansData) {
      const found = (plansData as Plan[]).find((p) => p.id === (subData as Subscription).plan_id);
      setCurrentPlan(found ?? null);
    }

    // Get company count for this user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: memberships } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("role", "owner");
      setCompanyCount(memberships?.length ?? 0);
    }

    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
  }, [companyLoading, companyId, loadData]);

  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  /* ── Change Plan ── */
  const handleChangePlan = async (newPlan: Plan) => {
    if (!companyId || !subscription) return;
    setChangingPlan(true);

    // Free plan → direct DB downgrade (no payment needed)
    if (newPlan.price_monthly === 0) {
      await supabase
        .from("company_subscriptions")
        .update({
          plan_id: newPlan.id,
          ai_actions_limit: newPlan.ai_actions_monthly,
          storage_limit_mb: newPlan.storage_mb,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);

      await supabase.from("billing_history").insert({
        company_id: companyId,
        description: `Plan changed to ${newPlan.name}`,
        amount: 0,
        currency: "USD",
        type: "subscription",
      });

      setChangingPlan(false);
      setShowPlanPicker(false);
      void loadData();
      return;
    }

    // Paid plan → redirect to Stripe checkout
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: newPlan.slug, interval: billingInterval }),
      });

      if (!response.ok) {
        setChangingPlan(false);
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // Stripe checkout failed
    }

    setChangingPlan(false);
  };

  /* ── Purchase Credits ── */
  const handlePurchaseCredits = async (option: (typeof CREDIT_OPTIONS)[number]) => {
    if (!companyId) return;
    setPurchasingCredits(option.credits);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "payment",
          amount: option.price,
          description: `${option.credits} AI Credits`,
          credits: option.credits,
          companyId,
        }),
      });

      if (!response.ok) {
        setPurchasingCredits(null);
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // Stripe checkout failed
    }

    setPurchasingCredits(null);
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const planSlug = currentPlan?.slug ?? "free";
  const PlanIcon = PLAN_ICONS[planSlug] ?? Rocket;
  const planColor = PLAN_COLORS[planSlug] ?? PLAN_COLORS.free;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="app-kicker">{tOverview("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* ── Current Plan Card ── */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${planColor.bg}`}>
            <PlanIcon className={`h-6 w-6 ${planColor.icon}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {currentPlan?.name ?? "Free"}{" "}
              <span className="ml-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {subscription?.status === "active" ? t("active") : (subscription?.status ?? t("active"))}
              </span>
            </h2>
            {subscription?.current_period_end && (
              <p className="text-xs text-gray-400">
                {t("renewsOn", {
                  date: new Date(subscription.current_period_end).toLocaleDateString(),
                })}
              </p>
            )}
          </div>
        </div>

        {/* Usage Meters */}
        {subscription && currentPlan && (
          <div className="space-y-3">
            <UsageMeter
              label={t("meters.aiActions")}
              used={subscription.ai_actions_used}
              limit={subscription.ai_actions_limit}
              icon={Zap}
            />
            <UsageMeter
              label={t("meters.storage")}
              used={subscription.storage_used_mb}
              limit={subscription.storage_limit_mb}
              icon={HardDrive}
              unit="GB"
            />
            <UsageMeter
              label={t("meters.companies")}
              used={companyCount}
              limit={currentPlan.max_companies}
              icon={Building2}
            />
            <UsageMeter
              label={t("meters.users")}
              used={memberCount}
              limit={currentPlan.max_users}
              icon={Users}
            />
            {currentPlan.document_ocr_monthly > 0 && (
              <UsageMeter
                label={t("meters.ocr")}
                used={0}
                limit={currentPlan.document_ocr_monthly}
                icon={ScanLine}
              />
            )}
          </div>
        )}

        <button
          onClick={() => setShowPlanPicker(!showPlanPicker)}
          className="app-secondary-btn px-4 py-2 text-sm font-medium"
        >
          {t("changePlan")}
        </button>
      </div>

      {/* ── Plan Picker ── */}
      {showPlanPicker && (
        <div className="space-y-4">
          {/* Billing interval toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                billingInterval === "monthly"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("yearly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                billingInterval === "yearly"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("yearly")}
            </button>
          </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const slug = plan.slug;
            const Icon = PLAN_ICONS[slug] ?? Rocket;
            const colors = PLAN_COLORS[slug] ?? PLAN_COLORS.free;
            const isCurrent = plan.id === currentPlan?.id;
            const isDowngrade =
              currentPlan && plan.sort_order < currentPlan.sort_order;
            const displayPrice = billingInterval === "yearly" ? plan.price_yearly : plan.price_monthly;

            return (
              <div
                key={plan.id}
                className={`app-card p-5 space-y-3 ring-2 ${
                  isCurrent ? colors.ring : "ring-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {displayPrice > 0
                        ? `$${displayPrice}/${billingInterval === "yearly" ? "yr" : "mo"}`
                        : t("free")}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1 text-xs text-gray-600">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {plan.ai_actions_monthly > 0
                      ? `${plan.ai_actions_monthly} ${t("aiActionsMonth")}`
                      : t("noAi")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {plan.max_users} {t("teamMembers")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {(plan.storage_mb / 1024).toFixed(0)}GB {t("storage")}
                  </li>
                  {plan.pdf_export && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-500" />
                      {t("pdfExport")}
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <p className="text-center text-xs font-medium text-indigo-600">
                    {t("currentPlan")}
                  </p>
                ) : (
                  <button
                    onClick={() => void handleChangePlan(plan)}
                    disabled={changingPlan}
                    className={`w-full rounded-full px-3 py-2 text-xs font-medium transition ${
                      isDowngrade
                        ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {changingPlan ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : isDowngrade ? (
                      t("downgrade")
                    ) : (
                      t("upgrade")
                    )}
                  </button>
                )}

                {isDowngrade && !isCurrent && (
                  <p className="text-center text-[10px] text-amber-600">
                    {t("downgradeWarning")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* ── AI Credits Section (hidden for free plan) ── */}
      {planSlug !== "free" && <div className="app-card p-6 space-y-4" id="credits">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
            <Zap className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">{t("credits.title")}</h2>
            <p className="text-xs text-gray-400">
              {t("credits.balance", { count: totalCredits })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {CREDIT_OPTIONS.map((opt) => (
            <button
              key={opt.credits}
              onClick={() => void handlePurchaseCredits(opt)}
              disabled={purchasingCredits !== null}
              className="app-card flex flex-col items-center gap-2 px-4 py-4 text-center transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <p className="text-lg font-bold text-gray-800">{opt.label}</p>
              <p className="text-sm font-semibold text-indigo-600">${opt.price}</p>
              {opt.save && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {t("credits.save", { pct: opt.save })}
                </span>
              )}
              {purchasingCredits === opt.credits ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              ) : (
                <span className="text-xs font-medium text-indigo-600">
                  {t("credits.purchase")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>}

      {/* ── Billing History ── */}
      <div className="app-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">{t("history.title")}</h2>

        {billing.length === 0 ? (
          <div className="py-8 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">{t("history.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium">{t("history.date")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("history.description")}</th>
                  <th className="pb-2 pr-4 font-medium text-right">{t("history.amount")}</th>
                  <th className="pb-2 font-medium">{t("history.type")}</th>
                </tr>
              </thead>
              <tbody>
                {billing.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 text-gray-500">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">{row.description}</td>
                    <td className="py-2.5 pr-4 text-right font-medium text-gray-800">
                      ${row.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 capitalize">
                        {row.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
