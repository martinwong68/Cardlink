"use client";

import Link from "next/link";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";

import { trackInterfaceEvent } from "@/src/lib/business/interface-events";

export default function BusinessSettingsPage() {
  const t = useTranslations("businessSettings");

  const handleSwitchToClient = () => {
    trackInterfaceEvent({
      event_name: "interface.switch.requested",
      from_interface: "business",
      to_interface: "client",
      eligibility_result: "eligible",
      reason_code: "user_initiated",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="space-y-3">
        <Link
          href="/business/settings/main-account"
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800 transition hover:-translate-y-0.5 hover:border-indigo-200"
        >
          <span className="flex items-center gap-2">{t("links.mainAccount")}</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          href="/dashboard/settings"
          onClick={handleSwitchToClient}
          className="app-card flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800 transition hover:-translate-y-0.5 hover:border-indigo-200"
        >
          <span className="flex items-center gap-2">
            {t("links.switchToClient")}
            <LayoutDashboard className="h-4 w-4 text-indigo-500" />
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>
    </div>
  );
}
