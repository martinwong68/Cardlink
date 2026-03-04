"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import { canAccessCRM, resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import { getFriends } from "@/src/lib/connections";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("settings");
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);

  const getViewerPlan = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { plan: "free" as const, premiumUntil: null as string | null };
    }

    const { data } = await supabase
      .from("profiles")
      .select("plan, premium_until")
      .eq("id", userData.user.id)
      .maybeSingle();
    return {
      plan: resolveEffectiveViewerPlan(data),
      premiumUntil: data?.premium_until ?? null,
    };
  };

  const handleExport = async () => {
    setMessage(null);
    setIsExporting(true);

    const planState = await getViewerPlan();
    if (!canAccessCRM(planState.plan)) {
      setMessage(t("errors.upgradeToExport"));
      setIsExporting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setMessage(t("errors.signInExport"));
      setIsExporting(false);
      return;
    }

    const friends = await getFriends(userData.user.id);
    const rows = [
      [
        t("export.headers.name"),
        t("export.headers.title"),
        t("export.headers.company"),
        t("export.headers.connectedAt"),
      ],
      ...friends.map((friend) => [
        friend.fullName,
        friend.title ?? "",
        friend.company ?? "",
        friend.connectedAt ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, "\"\"")}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t("export.fileName");
    link.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  useEffect(() => {
    const loadPlan = async () => {
      const planState = await getViewerPlan();
      setViewerPlan(planState.plan);
      setPremiumUntil(planState.premiumUntil);
    };

    void loadPlan();
  }, []);

  const formatDateOnly = (value: string | null) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const handleDowngrade = async () => {
    setMessage(null);
    setIsOpeningPortal(true);

    const response = await fetch("/api/stripe/portal", { method: "POST" });
    if (!response.ok) {
      setMessage(t("errors.openPortal"));
      setIsOpeningPortal(false);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setMessage(t("errors.openPortal"));
      setIsOpeningPortal(false);
      return;
    }

    window.location.href = data.url;
  };

  const premiumUntilDateLabel = formatDateOnly(premiumUntil);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">
          {t("brand")}
        </p>
        <h1 className="app-title mt-2 text-2xl font-semibold">
          {t("title")}
        </h1>
        <p className="app-subtitle mt-2 text-sm">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/dashboard/settings/profile"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
        >
          {t("links.profile")}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/settings/privacy"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
        >
          {t("links.privacy")}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/settings/password"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
        >
          {t("links.password")}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        {viewerPlan === "premium" ? (
          <div className="app-card-soft flex items-center justify-between gap-3 px-4 py-4 text-sm text-slate-700">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{t("links.subscriptionActive")}</p>
              <p className="text-xs text-slate-500">
                {premiumUntilDateLabel
                  ? t("links.premiumUntil", { date: premiumUntilDateLabel })
                  : t("links.premiumBadge")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDowngrade}
              disabled={isOpeningPortal}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOpeningPortal ? t("links.openingPortal") : t("links.downgrade")}
            </button>
          </div>
        ) : (
          <Link
            href="/dashboard/settings/upgrade"
            className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
          >
            {t("links.subscription")}
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        )}

        <Link
          href="/dashboard/cards?tab=nfc"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
        >
          {t("links.orderNfc")}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex items-center gap-2">
            {t("links.export")}
            <Download className="h-4 w-4 text-violet-500" />
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        <Link
          href="/dashboard/settings/support"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-200"
        >
          {t("links.support")}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300"
        >
          <span className="flex items-center gap-2">
            {t("actions.logout")}
            <LogOut className="h-4 w-4" />
          </span>
          <ChevronRight className="h-4 w-4 text-rose-300" />
        </button>
      </div>

      {message ? (
        <p className="app-error px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
