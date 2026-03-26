"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Crown, Rocket, Zap, Loader2 } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { resolveEffectiveViewerPlan } from "@/src/lib/visibility";

type Interval = "monthly" | "yearly";

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
  sort_order: number;
};

const PLAN_ACCENT: Record<string, { border: string; badge: string; btn: string; icon: typeof Rocket }> = {
  starter: { border: "border-neutral-200", badge: "", btn: "bg-neutral-800 text-white hover:bg-neutral-900", icon: Rocket },
  professional: {
    border: "border-primary-600 border-2",
    badge: "bg-primary-600",
    btn: "bg-primary-600 text-white hover:bg-primary-700",
    icon: Zap,
  },
  business: {
    border: "border-amber-500 border-2",
    badge: "bg-amber-500",
    btn: "bg-amber-500 text-white hover:bg-amber-600",
    icon: Crown,
  },
};

export default function UpgradePage() {
  const supabase = useMemo(() => createClient(), []);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const t = useTranslations("upgrade");

  useEffect(() => {
    const loadState = async () => {
      const [{ data: userData }, { data: plansData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (plansData) setPlans(plansData as Plan[]);

      if (!userData?.user) {
        setViewerPlan("free");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("plan, premium_until")
        .eq("id", userData.user.id)
        .maybeSingle();
      setViewerPlan(resolveEffectiveViewerPlan(data));
      setPremiumUntil(data?.premium_until ?? null);
    };

    void loadState();
  }, [supabase]);

  const handleCheckout = async (planSlug: string, billingInterval: Interval) => {
    setMessage(null);
    setIsLoading(`${planSlug}-${billingInterval}`);

    const origin = window.location.origin;
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug,
        interval: billingInterval,
        successUrl: `${origin}/dashboard/settings/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/dashboard/settings/upgrade`,
      }),
    });

    if (!response.ok) {
      setMessage(t("errors.checkout"));
      setIsLoading(null);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setMessage(t("errors.unavailable"));
      setIsLoading(null);
      return;
    }

    window.location.href = data.url;
  };

  const handleManageBilling = async () => {
    setMessage(null);
    setIsPortalLoading(true);

    const response = await fetch("/api/stripe/portal", { method: "POST" });
    if (!response.ok) {
      setMessage(t("errors.portal"));
      setIsPortalLoading(false);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setMessage(t("errors.portal"));
      setIsPortalLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  const premiumUntilLabel = premiumUntil ? premiumUntil.slice(0, 10) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            interval === "monthly"
              ? "bg-primary-600 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {t("toggle.monthly")}
        </button>
        <button
          type="button"
          onClick={() => setInterval("yearly")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            interval === "yearly"
              ? "bg-primary-600 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {t("toggle.yearly")}
          <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {t("toggle.save")}
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const accent = PLAN_ACCENT[plan.slug] ?? PLAN_ACCENT.starter;
          const Icon = accent.icon;
          const price = interval === "yearly" ? plan.price_yearly : plan.price_monthly;
          const isCurrentPlan = false;
          const isPremium = viewerPlan === "premium";
          const loadingKey = `${plan.slug}-${interval}`;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl ${accent.border} bg-white p-6 shadow-sm`}
            >
              {/* Badge */}
              {accent.badge && (
                <div
                  className={`absolute -top-3.5 left-6 rounded-full ${accent.badge} px-3 py-1 text-xs font-semibold text-white`}
                >
                  {plan.slug === "professional" ? t("premium.badge") : t("business.badge")}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                  <Icon className="h-5 w-5 text-neutral-600" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900">{plan.name}</h2>
              </div>

              {/* Price */}
              <div className="mt-4">
                <p className="text-3xl font-semibold text-neutral-900">
                  ${price}
                  <span className="text-base font-normal text-neutral-400">
                    /{interval === "yearly" ? t("toggle.yr") : t("toggle.mo")}
                  </span>
                </p>
                {interval === "yearly" && (
                  <p className="mt-1 text-xs text-neutral-400">
                    ${(price / 12).toFixed(2)}/{t("toggle.mo")}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-2.5 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {plan.max_companies >= 999 ? t("features.unlimitedCompanies") : `${plan.max_companies} ${t("features.companies")}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {plan.max_users} {t("features.users")}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {plan.storage_mb >= 1024
                    ? `${(plan.storage_mb / 1024).toFixed(0)} GB`
                    : `${plan.storage_mb} MB`}{" "}
                  {t("features.storage")}
                </li>
                {plan.ai_actions_monthly > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {plan.ai_actions_monthly} {t("features.aiActions")}
                  </li>
                )}
                {plan.pdf_export && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {t("features.pdfExport")}
                  </li>
                )}
                {plan.document_ocr_monthly > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {plan.document_ocr_monthly} {t("features.ocrDocs")}
                  </li>
                )}
              </ul>

              {/* Action */}
              <div className="mt-6">
                {isCurrentPlan ? (
                  <p className="text-center text-sm font-medium text-neutral-400">
                    {t("actions.currentPlan")}
                  </p>
                ) : isPremium ? (
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-semibold text-neutral-600">
                      {t("premium.status")}
                    </p>
                    {premiumUntilLabel && (
                      <p className="text-xs text-neutral-400">
                        {t("premium.until", { date: premiumUntilLabel })}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleManageBilling}
                      disabled={isPortalLoading}
                      className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPortalLoading ? t("actions.redirecting") : t("actions.manageBilling")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.slug, interval)}
                    disabled={isLoading !== null}
                    className={`w-full rounded-full px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${accent.btn}`}
                  >
                    {isLoading === loadingKey ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    ) : (
                      t("actions.subscribe")
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      )}
    </div>
  );
}
