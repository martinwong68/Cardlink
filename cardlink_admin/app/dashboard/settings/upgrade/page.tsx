"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type Interval = "monthly" | "yearly";

export default function UpgradePage() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState<Interval | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const t = useTranslations("upgrade");

  useEffect(() => {
    const loadPlan = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setViewerPlan("free");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", userData.user.id)
        .maybeSingle();
      setViewerPlan(data?.plan === "premium" ? "premium" : "free");
    };

    void loadPlan();
  }, [supabase]);

  const handleCheckout = async (interval: Interval) => {
    setMessage(null);
    setIsLoading(interval);

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("free.title")}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {t("free.badge")}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">$0</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li>{t("free.features.cards")}</li>
            <li>{t("free.features.fields")}</li>
            <li>{t("free.features.public")}</li>
            <li>{t("free.features.connect")}</li>
            <li>{t("free.features.feed")}</li>
          </ul>
        </div>

        <div className="relative rounded-3xl border-2 border-violet-600 bg-white p-6 shadow-lg">
          <div className="absolute -top-4 left-6 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
            {t("premium.badge")}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("premium.title")}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {t("premium.monthlyLabel")}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("premium.yearlyLabel")}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            $9.99
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li>{t("premium.features.unlimitedCards")}</li>
            <li>{t("premium.features.unlimitedFields")}</li>
            <li>{t("premium.features.fullDetails")}</li>
            <li>{t("premium.features.crm")}</li>
            <li>{t("premium.features.analytics")}</li>
            <li>{t("premium.features.export")}</li>
            <li>{t("premium.features.themes")}</li>
            <li>{t("premium.features.support")}</li>
          </ul>
          <div className="mt-6">
            {viewerPlan === "premium" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                {t("premium.status")}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleCheckout("monthly")}
                  disabled={isLoading !== null}
                  className="rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading === "monthly"
                    ? t("actions.redirecting")
                    : t("actions.upgradeMonthly")}
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckout("yearly")}
                  disabled={isLoading !== null}
                  className="rounded-full border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-600 shadow-sm transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading === "yearly"
                    ? t("actions.redirecting")
                    : t("actions.upgradeYearly")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
