"use client";

import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";

import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LanguageSettingsPage() {
  const t = useTranslations("businessSettingsOverview");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.language.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.language.desc")}</p>
      </div>
      <div className="app-card p-6">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
