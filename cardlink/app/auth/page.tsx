import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AuthPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          {t("brand")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("subtitle")}
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            {t("actions.createAccount")}
          </Link>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
          >
            {t("actions.signIn")}
          </Link>
          <Link
            href="/community"
            className="flex w-full items-center justify-center text-xs font-semibold text-slate-500"
          >
            {t("actions.browseCommunity")}
          </Link>
        </div>
      </div>
    </div>
  );
}
