"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function UpgradeSuccessPage() {
  const t = useTranslations("upgradeSuccess");
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/stripe/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        {t("title")}
      </h1>
      <p className="text-sm text-gray-500">
        {t("subtitle")}
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        {t("action")}
      </Link>
    </div>
  );
}
