"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Building2,
  Building,
  CreditCard,
  Bot,
  BellRing,
  Globe,
  Plug,
  Shield,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { trackInterfaceEvent } from "@/src/lib/business/interface-events";

const settingsCards = [
  { key: "mainAccount" as const, icon: Building2, color: "bg-blue-50 text-blue-600", href: "/business/settings/main-account" },
  { key: "companyProfile" as const, icon: Building, color: "bg-indigo-50 text-indigo-600", href: "/business/settings/company" },
  { key: "planBilling" as const, icon: CreditCard, color: "bg-emerald-50 text-emerald-600", href: "/business/settings/plan" },
  { key: "aiPreferences" as const, icon: Bot, color: "bg-violet-50 text-violet-600", href: "/business/settings/ai" },
  { key: "notificationSettings" as const, icon: BellRing, color: "bg-orange-50 text-orange-600", href: "/business/settings/notifications" },
  { key: "language" as const, icon: Globe, color: "bg-teal-50 text-teal-600", href: "/business/settings/language" },
  { key: "integrations" as const, icon: Plug, color: "bg-pink-50 text-pink-600", href: "/business/settings/integrations" },
];

const ownerCard = {
  key: "ownerPanel" as const,
  icon: Shield,
  color: "bg-amber-50 text-amber-600",
  href: "/business/settings/owner",
};

export default function BusinessSettingsPage() {
  const t = useTranslations("businessSettingsOverview");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function checkOwner() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();
      if (data) setIsOwner(true);
    }
    checkOwner();
  }, []);

  const handleSwitchToClient = () => {
    trackInterfaceEvent({
      event_name: "interface.switch.requested",
      from_interface: "business",
      to_interface: "client",
      eligibility_result: "eligible",
      reason_code: "user_initiated",
    });
  };

  const allCards = isOwner ? [...settingsCards, ownerCard] : settingsCards;

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {allCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              href={card.href}
              className="app-card group flex items-center gap-4 px-4 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {t(`cards.${card.key}.title`)}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {t(`cards.${card.key}.desc`)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition" />
            </Link>
          );
        })}
      </div>

      {/* Switch to Client GUI */}
      <Link
        href="/dashboard/settings"
        onClick={handleSwitchToClient}
        className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800 transition hover:-translate-y-0.5 hover:border-indigo-200"
      >
        <span className="flex items-center gap-2">
          {t("switchToClient")}
          <LayoutDashboard className="h-4 w-4 text-indigo-500" />
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </Link>
    </div>
  );
}
