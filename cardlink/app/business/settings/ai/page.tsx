"use client";

import { useTranslations } from "next-intl";
import { Bot } from "lucide-react";

export default function AiPreferencesSettingsPage() {
  const t = useTranslations("businessSettingsOverview");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.aiPreferences.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.aiPreferences.desc")}</p>
      </div>
      <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 mb-4">
          <Bot className="h-6 w-6 text-violet-400" />
        </div>
        <p className="text-sm text-gray-400">{t("cards.aiPreferences.desc")}</p>
      </div>
    </div>
  );
}
