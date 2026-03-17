"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, ChevronRight, CreditCard, Download, HelpCircle, Lock, LogOut, Mail, Shield, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import { canAccessCRM, resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import { getFriends } from "@/src/lib/connections";
import { trackInterfaceEvent } from "@/src/lib/business/interface-events";

type BusinessEligibilityState = {
  eligible: boolean;
  isMasterUser: boolean;
  reasonCode: string;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("settings");
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [businessEligibility, setBusinessEligibility] =
    useState<BusinessEligibilityState | null>(null);

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

  useEffect(() => {
    const loadBusinessEligibility = async () => {
      try {
        const response = await fetch("/api/interface/eligibility", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          setBusinessEligibility({
            eligible: false,
            isMasterUser: false,
            reasonCode: "not_authenticated",
          });
          return;
        }

        const data = (await response.json()) as BusinessEligibilityState;
        setBusinessEligibility(data);
      } catch {
        setBusinessEligibility({
          eligible: false,
          isMasterUser: false,
          reasonCode: "request_failed",
        });
      }
    };

    void loadBusinessEligibility();
  }, []);

  useEffect(() => {
    const notice = searchParams.get("notice");
    if (notice === "business-access-denied") {
      trackInterfaceEvent({
        event_name: "interface.switch.denied",
        from_interface: "client",
        to_interface: "business",
        eligibility_result: "denied",
        reason_code: "route_guard_redirect",
      });
    }
  }, [searchParams, t]);

  const noticeMessage =
    searchParams.get("notice") === "business-access-denied"
      ? t("notices.businessAccessDenied")
      : null;

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

  const handleSwitchToBusiness = () => {
    trackInterfaceEvent({
      event_name: "interface.switch.requested",
      from_interface: "client",
      to_interface: "business",
      eligibility_result: "eligible",
      reason_code: businessEligibility?.reasonCode ?? null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Account Section */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Account
        </span>
        <div className="mt-1 space-y-1">
          <Link
            href="/dashboard/settings/profile"
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <User className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.profile")}</div>
              <div className="text-xs text-gray-500">Name, email, phone</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/settings/privacy"
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <Shield className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.privacy")}</div>
              <div className="text-xs text-gray-500">Data sharing, visibility</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/settings/password"
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <Lock className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.password")}</div>
              <div className="text-xs text-gray-500">Change password, 2FA</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Subscription Section */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Subscription
        </span>
        <div className="mt-1 space-y-1">
          {viewerPlan === "premium" ? (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{t("links.subscriptionActive")}</div>
                <div className="text-xs text-gray-500">
                  {premiumUntilDateLabel
                    ? t("links.premiumUntil", { date: premiumUntilDateLabel })
                    : t("links.premiumBadge")}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDowngrade}
                disabled={isOpeningPortal}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isOpeningPortal ? t("links.openingPortal") : t("links.downgrade")}
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard/settings/upgrade"
              className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
            >
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{t("links.subscription")}</div>
                <div className="text-xs text-gray-500">Current: Free</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </Link>
          )}

          <Link
            href="/dashboard/cards?tab=nfc"
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <CreditCard className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.orderNfc")}</div>
              <div className="text-xs text-gray-500">Order physical NFC card</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Support Section */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Support
        </span>
        <div className="mt-1 space-y-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.export")}</div>
              <div className="text-xs text-gray-500">Export contacts as CSV</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </button>

          <Link
            href="/dashboard/settings/support"
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.support")}</div>
              <div className="text-xs text-gray-500">FAQs, chat support</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          {businessEligibility?.eligible ? (
            <Link
              href="/business"
              onClick={handleSwitchToBusiness}
              className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
            >
              <BriefcaseBusiness className="h-4 w-4 text-indigo-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{t("links.switchToBusiness")}</div>
                <div className="text-xs text-gray-500">Switch to Business mode</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3"
      >
        <LogOut className="h-4 w-4 text-rose-600" />
        <span className="text-sm font-semibold text-rose-600">{t("actions.logout")}</span>
      </button>

      {message || noticeMessage ? (
        <p className="app-error px-3 py-2 text-sm">
          {message ?? noticeMessage}
        </p>
      ) : null}
    </div>
  );
}
