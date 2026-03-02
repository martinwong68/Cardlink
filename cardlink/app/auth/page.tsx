import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AuthPage() {
  const t = await getTranslations("auth");
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="app-card w-full max-w-md p-8">
        <p className="app-kicker">
          {t("brand")}
        </p>
        <h1 className="app-title mt-3 text-2xl font-semibold">
          {t("title")}
        </h1>
        <p className="app-subtitle mt-2 text-sm">
          {t("subtitle")}
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/signup"
            className="app-primary-btn flex w-full items-center justify-center px-4 py-2 text-sm font-semibold"
          >
            {t("actions.createAccount")}
          </Link>
          <Link
            href="/login"
            className="app-secondary-btn flex w-full items-center justify-center px-4 py-2 text-sm font-semibold"
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
