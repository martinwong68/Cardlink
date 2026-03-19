"use client";

import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";

export default function BusinessBookingPage() {
  const t = useTranslations("businessHandle");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("moduleNames.booking")}</h1>
      </div>

      <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 mb-4">
          <Calendar className="h-6 w-6 text-teal-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-700 mb-1">{t("comingSoon")}</h2>
        <p className="text-sm text-gray-400">{t("comingSoonDesc")}</p>
      </div>
    </div>
  );
}
