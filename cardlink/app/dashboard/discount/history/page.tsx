import { getTranslations } from "next-intl/server";

import DiscountRedeemPanel from "@/components/DiscountRedeemPanel";

export default async function DiscountHistoryPage() {
  const t = await getTranslations("discountHistory");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("subtitle")}
        </p>
      </div>

      <DiscountRedeemPanel initialAdminView="history" />
    </div>
  );
}
