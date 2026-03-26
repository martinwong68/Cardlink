"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, ChevronRight, CreditCard, Download, Globe, HelpCircle, Loader2, Lock, LogOut, Mail, Plus, Shield, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import { canAccessCRM, resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import { getFriends } from "@/src/lib/connections";
import { trackInterfaceEvent } from "@/src/lib/business/interface-events";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type BusinessEligibilityState = {
  eligible: boolean;
  isMasterUser: boolean;
  reasonCode: string;
};

type ProfileData = {
  plan?: string | null;
  premium_until?: string | null;
  purchased_card_slots?: number | null;
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
  const [planSlug, setPlanSlug] = useState<string>("free");
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [purchasedSlots, setPurchasedSlots] = useState(0);
  const [purchasingSlot, setPurchasingSlot] = useState(false);
  const [businessEligibility, setBusinessEligibility] =
    useState<BusinessEligibilityState | null>(null);

  const getViewerPlan = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { plan: "free" as const, premiumUntil: null as string | null, slug: "free", purchasedCardSlots: 0 };
    }

    const { data } = await supabase
      .from("profiles")
      .select("plan, premium_until, purchased_card_slots")
      .eq("id", userData.user.id)
      .maybeSingle();
    const profile = data as ProfileData | null;
    return {
      plan: resolveEffectiveViewerPlan(profile),
      premiumUntil: profile?.premium_until ?? null,
      slug: profile?.plan ?? "free",
      purchasedCardSlots: profile?.purchased_card_slots ?? 0,
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
      setPlanSlug(planState.slug);
      setPurchasedSlots(planState.purchasedCardSlots);
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

  const PLAN_DISPLAY_NAMES: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    business: "Business",
    free: "Free",
  };
  const displayPlanName = PLAN_DISPLAY_NAMES[planSlug] ?? (viewerPlan === "premium" ? "Premium" : "Free");

  const handlePurchaseCardSlot = async () => {
    setMessage(null);
    setPurchasingSlot(true);

    try {
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "payment",
          amount: 8,
          description: "Extra Namecard Slot",
          successUrl: `${origin}/dashboard/settings?card_slot=success`,
          cancelUrl: `${origin}/dashboard/settings`,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to start checkout");
        setPurchasingSlot(false);
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      setMessage("Failed to start checkout");
    }
    setPurchasingSlot(false);
  };

  // Handle card slot purchase success
  useEffect(() => {
    if (searchParams.get("card_slot") === "success") {
      const updateSlots = async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Use a raw SQL increment to avoid race conditions
          const { data: updated, error } = await supabase.rpc("increment_purchased_card_slots" as string, {
            p_user_id: userData.user.id,
          });
          if (error) {
            // Fallback: read-then-write if RPC doesn't exist
            const { data: profile } = await supabase
              .from("profiles")
              .select("purchased_card_slots")
              .eq("id", userData.user.id)
              .maybeSingle();
            const currentSlots = (profile as ProfileData | null)?.purchased_card_slots ?? 0;
            await supabase
              .from("profiles")
              .update({ purchased_card_slots: currentSlots + 1 })
              .eq("id", userData.user.id);
            setPurchasedSlots(currentSlots + 1);
          } else {
            setPurchasedSlots(typeof updated === "number" ? updated : purchasedSlots + 1);
          }
          setMessage("Extra card slot purchased successfully!");
        }
      };
      void updateSlots();
    }
  }, [searchParams, supabase]);

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
                <div className="text-sm font-medium text-gray-800">
                  {displayPlanName} Plan
                </div>
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
                <div className="text-xs text-gray-500">Current: {displayPlanName}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </Link>
          )}

          {/* Extra card slot purchase */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <Plus className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">Extra Card Slots</div>
              <div className="text-xs text-gray-500">
                {purchasedSlots > 0
                  ? `${purchasedSlots} extra slot${purchasedSlots > 1 ? "s" : ""} purchased`
                  : "Purchase additional namecard slots ($8 each)"}
              </div>
            </div>
            <button
              type="button"
              onClick={handlePurchaseCardSlot}
              disabled={purchasingSlot}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {purchasingSlot ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "+1 Slot"
              )}
            </button>
          </div>

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

      {/* Preferences Section */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Preferences
        </span>
        <div className="mt-1 space-y-1">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <Globe className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.language")}</div>
              <div className="text-xs text-gray-500">Select display language</div>
            </div>
            <LanguageSwitcher compact />
          </div>
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

          <Link
            href={businessEligibility?.eligible ? "/business" : "/register-business"}
            onClick={businessEligibility?.eligible ? handleSwitchToBusiness : undefined}
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
          >
            <BriefcaseBusiness className="h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{t("links.switchToBusiness")}</div>
              <div className="text-xs text-gray-500">
                {businessEligibility?.eligible ? "Switch to Business mode" : "Create a business account"}
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>
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
