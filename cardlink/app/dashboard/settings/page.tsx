"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CreditCard, Crown, Download, HelpCircle, Lock, LogOut, Shield, Smartphone, User } from "lucide-react";
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
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    title: string | null;
  } | null>(null);

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
    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email, title")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile(data as typeof profile);
    };
    void loadProfile();
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

  const settingsTiles = [
    { icon: User, label: t("links.profile"), href: "/dashboard/settings/profile", color: "bg-primary-50 text-primary-600" },
    { icon: Shield, label: t("links.privacy"), href: "/dashboard/settings/privacy", color: "bg-teal-50 text-teal-600" },
    { icon: Lock, label: t("links.password"), href: "/dashboard/settings/password", color: "bg-amber-50 text-amber-600" },
    viewerPlan === "premium"
      ? null
      : { icon: Crown, label: t("links.subscription"), href: "/dashboard/settings/upgrade", color: "bg-purple-50 text-purple-600" },
    { icon: Smartphone, label: t("links.orderNfc"), href: "/dashboard/cards?tab=nfc", color: "bg-cyan-50 text-cyan-600" },
    { icon: Download, label: t("links.export"), onClick: handleExport, color: "bg-emerald-50 text-emerald-600" },
    { icon: HelpCircle, label: t("links.support"), href: "/dashboard/settings/support", color: "bg-sky-50 text-sky-600" },
    businessEligibility?.eligible
      ? { icon: BriefcaseBusiness, label: t("links.switchToBusiness"), href: "/business", onClick: handleSwitchToBusiness, color: "bg-primary-50 text-primary-600" }
      : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string; href?: string; onClick?: () => void; color: string }[];

  const displayName = profile?.full_name || "User";
  const displayInitials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CL";

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
        <Link href="/dashboard/settings/profile" className="shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary-100"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
              {displayInitials}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-800 truncate">{displayName}</p>
          {profile?.title ? (
            <p className="text-xs text-neutral-500 truncate">{profile.title}</p>
          ) : null}
          {profile?.email ? (
            <p className="text-xs text-neutral-400 truncate">{profile.email}</p>
          ) : null}
        </div>
        <Link
          href="/dashboard/settings/profile"
          className="shrink-0 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100"
        >
          {t("links.profile")}
        </Link>
      </div>

      {/* Premium banner */}
      {viewerPlan === "premium" ? (
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-3 text-white shadow-sm">
          <div>
            <p className="text-sm font-bold">{t("links.subscriptionActive")}</p>
            <p className="text-xs opacity-80">
              {premiumUntilDateLabel
                ? t("links.premiumUntil", { date: premiumUntilDateLabel })
                : t("links.premiumBadge")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDowngrade}
            disabled={isOpeningPortal}
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isOpeningPortal ? t("links.openingPortal") : t("links.downgrade")}
          </button>
        </div>
      ) : null}

      {/* 2-col square grid — mobile; 3-col on md; 4-col on lg */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {settingsTiles.map((tile) => {
          const Icon = tile.icon;
          const content = (
            <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-neutral-700 text-center leading-tight">
                {tile.label}
              </span>
            </div>
          );

          if (tile.href && !tile.onClick) {
            return (
              <Link key={tile.label} href={tile.href}>
                {content}
              </Link>
            );
          }

          if (tile.href && tile.onClick) {
            return (
              <Link key={tile.label} href={tile.href} onClick={tile.onClick}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              disabled={isExporting}
              className="text-left disabled:cursor-not-allowed disabled:opacity-70"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300"
      >
        <LogOut className="h-4 w-4" />
        {t("actions.logout")}
      </button>

      {message || noticeMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message ?? noticeMessage}
        </p>
      ) : null}
    </div>
  );
}
