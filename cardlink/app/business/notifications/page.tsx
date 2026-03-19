"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

export default function BusinessNotificationsPage() {
  const t = useTranslations("businessNotifications");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <Bell className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-400">{t("empty")}</p>
      </div>
    </div>
  );
}
