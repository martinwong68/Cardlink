"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  CreditCard,
  ArrowLeft,
  RefreshCw,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type ConnectStatus = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  requiresAction: boolean;
};

export default function StripeConnectPage() {
  const t = useTranslations("stripeConnect");
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/stripe/connect/status", {
        headers: { "x-business-scope": "true" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to fetch status");
      }
      const data: ConnectStatus = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh after onboarding redirect
  useEffect(() => {
    if (searchParams.get("onboarding") === "complete") {
      fetchStatus();
    }
  }, [searchParams, fetchStatus]);

  const handleOnboard = async () => {
    try {
      setOnboarding(true);
      setError(null);
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-scope": "true",
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to start onboarding");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setOnboarding(false);
    }
  };

  const handleDashboard = async () => {
    try {
      setOpeningDashboard(true);
      setError(null);
      const res = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-scope": "true",
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to open dashboard");
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setOpeningDashboard(false);
    }
  };

  const isFullyActive =
    status?.connected &&
    status?.chargesEnabled &&
    status?.payoutsEnabled &&
    status?.onboardingComplete;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/business/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="app-kicker">{t("kicker")}</p>
          <h1 className="app-title mt-1 text-2xl font-semibold">
            {t("title")}
          </h1>
          <p className="app-subtitle mt-1 text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Content */}
      {!loading && status && (
        <>
          {/* Status card */}
          <div className="app-card p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isFullyActive
                    ? "bg-emerald-50 text-emerald-600"
                    : status.connected
                      ? "bg-amber-50 text-amber-600"
                      : "bg-gray-50 text-gray-400"
                }`}
              >
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800">
                  {isFullyActive
                    ? t("status.active")
                    : status.connected
                      ? t("status.pending")
                      : t("status.notConnected")}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isFullyActive
                    ? t("status.activeDesc")
                    : status.connected
                      ? t("status.pendingDesc")
                      : t("status.notConnectedDesc")}
                </p>

                {/* Capability indicators */}
                {status.connected && (
                  <div className="mt-4 space-y-2">
                    <StatusItem
                      ok={status.onboardingComplete}
                      label={t("capabilities.detailsSubmitted")}
                    />
                    <StatusItem
                      ok={status.chargesEnabled}
                      label={t("capabilities.chargesEnabled")}
                    />
                    <StatusItem
                      ok={status.payoutsEnabled}
                      label={t("capabilities.payoutsEnabled")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {!status.connected && (
                <button
                  onClick={handleOnboard}
                  disabled={onboarding}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {onboarding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {t("actions.connectStripe")}
                </button>
              )}

              {status.connected && status.requiresAction && (
                <button
                  onClick={handleOnboard}
                  disabled={onboarding}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {onboarding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {t("actions.completeOnboarding")}
                </button>
              )}

              {status.connected && status.onboardingComplete && (
                <button
                  onClick={handleDashboard}
                  disabled={openingDashboard}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {openingDashboard ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {t("actions.openDashboard")}
                </button>
              )}

              <button
                onClick={fetchStatus}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                {t("actions.refresh")}
              </button>
            </div>
          </div>

          {/* How it works section */}
          <div className="app-card p-6">
            <h3 className="text-base font-semibold text-gray-800">
              {t("howItWorks.title")}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <HowItWorksStep
                icon={<ShieldCheck className="h-5 w-5" />}
                title={t("howItWorks.step1.title")}
                desc={t("howItWorks.step1.desc")}
              />
              <HowItWorksStep
                icon={<CreditCard className="h-5 w-5" />}
                title={t("howItWorks.step2.title")}
                desc={t("howItWorks.step2.desc")}
              />
              <HowItWorksStep
                icon={<Banknote className="h-5 w-5" />}
                title={t("howItWorks.step3.title")}
                desc={t("howItWorks.step3.desc")}
              />
            </div>
          </div>

          {/* Stripe docs link */}
          <div className="text-center">
            <a
              href="https://docs.stripe.com/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition"
            >
              {t("learnMore")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function StatusItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-400" />
      )}
      <span className={ok ? "text-gray-700" : "text-gray-500"}>{label}</span>
    </div>
  );
}

function HowItWorksStep({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{desc}</p>
    </div>
  );
}
