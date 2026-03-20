"use client";

import { useTranslations } from "next-intl";
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export type UpgradePromptProps = {
  feature: string;
  currentPlan: string;
  description?: string;
  /** When true, renders inline (smaller) instead of full card */
  inline?: boolean;
};

export default function UpgradePrompt({
  feature,
  currentPlan,
  description,
  inline,
}: UpgradePromptProps) {
  const t = useTranslations("upgradePrompt");

  if (inline) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t("inlineLabel", { feature })}
        </span>
        <Link
          href="/business/settings/plan"
          className="ml-auto font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
        >
          {t("upgrade")}
        </Link>
      </div>
    );
  }

  return (
    <div className="app-card mx-auto max-w-md px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
        <Lock className="h-7 w-7 text-amber-500" />
      </div>

      <h3 className="text-base font-semibold text-gray-800">
        {t("lockedTitle", { feature })}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {description ?? t("defaultDescription")}
      </p>

      <p className="mt-4 text-xs text-gray-400">
        {t("yourPlan")}: <span className="font-medium text-gray-600">{currentPlan}</span>
      </p>

      <Link
        href="/business/settings/plan"
        className="app-primary-btn mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
      >
        {t("viewPlans")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
