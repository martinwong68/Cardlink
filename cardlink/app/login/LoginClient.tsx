"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "../../components/LanguageSwitcher";
import { createClient } from "@/src/lib/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const t = useTranslations("login");
  const returnToParam = searchParams.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push(returnTo ?? "/dashboard/community");
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorMessage(t("messages.enterEmailForReset"));
      return;
    }

    setIsSendingReset(true);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setIsSendingReset(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInfoMessage(t("messages.resetEmailSent"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
              {t("brand")}
            </p>
          </div>
          <div className="mt-3 flex justify-center">
            <LanguageSwitcher compact />
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              {t("fields.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              {t("fields.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={isSendingReset}
              className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-60"
            >
              {isSendingReset ? t("actions.sendingReset") : t("actions.forgotPassword")}
            </button>
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? t("actions.signingIn") : t("actions.signIn")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t("footer.newHere")} {" "}
          <Link
            className="font-semibold text-violet-600 hover:text-violet-700"
            href={
              returnTo
                ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
                : "/signup"
            }
          >
            {t("actions.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
