"use client";

import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ScanPage() {
  const t = useTranslations("scan");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("subtitle")}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <QrCode className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {t("comingSoon")}
        </p>
      </div>
    </div>
  );
}
