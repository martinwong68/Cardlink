import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getUserAccessState } from "@/src/lib/access-state";
import { createClient } from "@/src/lib/supabase/server";

export default async function BannedPage() {
  const supabase = await createClient();
  const t = await getTranslations("ban");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accessState = await getUserAccessState(supabase, user);

  if (!accessState.isBanned) {
    redirect("/dashboard/community");
  }

  const signOut = async () => {
    "use server";
    const scopedClient = await createClient();
    await scopedClient.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          {t("brand")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("description")}</p>

        <div className="mt-6 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700">
            {accessState.banScope === "company" ? t("scope.company") : t("scope.user")}
          </p>
          {accessState.companyName ? (
            <p className="text-sm text-rose-700">{t("company", { company: accessState.companyName })}</p>
          ) : null}
          {accessState.banReason ? (
            <p className="text-sm text-rose-700">{t("reason", { reason: accessState.banReason })}</p>
          ) : null}
          {accessState.bannedUntil ? (
            <p className="text-sm text-rose-700">
              {t("until", { date: new Date(accessState.bannedUntil).toLocaleString() })}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
          >
            {t("actions.back")}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              {t("actions.signOut")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
