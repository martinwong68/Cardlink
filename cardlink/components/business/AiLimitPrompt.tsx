"use client";

import { useTranslations } from "next-intl";
import { Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export type AiLimitPromptProps = {
  limit: number;
  used: number;
};

export default function AiLimitPrompt({ limit, used }: AiLimitPromptProps) {
  const t = useTranslations("aiLimitPrompt");

  return (
    <div className="app-card mx-auto max-w-md px-6 py-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
        <Zap className="h-6 w-6 text-orange-500" />
      </div>

      <h3 className="text-base font-semibold text-gray-800">
        {t("title")}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {t("description", { used, limit })}
      </p>

      <Link
        href="/business/settings/plan#credits"
        className="app-primary-btn mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
      >
        {t("purchaseCredits")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
