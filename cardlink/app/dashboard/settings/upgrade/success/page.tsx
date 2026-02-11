import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function UpgradeSuccessPage() {
  const t = await getTranslations("upgradeSuccess");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">
        {t("title")}
      </h1>
      <p className="text-sm text-slate-500">
        {t("subtitle")}
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
      >
        {t("action")}
      </Link>
    </div>
  );
}
