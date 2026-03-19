"use client";

import { useTranslations } from "next-intl";
import { Plug } from "lucide-react";

export default function IntegrationsSettingsPage() {
  const t = useTranslations("businessSettingsOverview");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.integrations.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.integrations.desc")}</p>
      </div>
      <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 mb-4">
          <Plug className="h-6 w-6 text-pink-400" />
        </div>
        <p className="text-sm text-gray-400">{t("cards.integrations.desc")}</p>
      </div>
    </div>
  );
}
