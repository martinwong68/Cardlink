"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useTranslations("resetPassword");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrapRecoverySession = async () => {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hash);

      const code = searchParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const flowType = hashParams.get("type");
      const hashErrorDescription = hashParams.get("error_description");
      const queryErrorDescription = searchParams.get("error_description");
      const errorDescription = queryErrorDescription ?? hashErrorDescription;

      if (errorDescription) {
        setErrorMessage(errorDescription);
        setIsReady(true);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setErrorMessage(error.message);
        }
      } else if (flowType === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setErrorMessage(error.message);
        }
      }

      if (code || hash) {
        window.history.replaceState(null, "", "/reset-password");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage((prev) => prev ?? t("errors.invalidOrExpiredLink"));
      }

      setIsReady(true);
    };

    void bootstrapRecoverySession();
  }, [supabase, t]);

  useEffect(() => {
    if (redirectCountdown === null) {
      return;
    }

    if (redirectCountdown <= 0) {
      router.push("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [redirectCountdown, router]);

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!isReady) {
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(t("errors.passwordLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("errors.passwordNotMatch"));
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);

    if (error) {
      const normalizedMessage = error.message.toLowerCase();
      if (normalizedMessage.includes("auth session missing") || normalizedMessage.includes("missing auth")) {
        setErrorMessage(t("errors.invalidOrExpiredLink"));
      } else {
        setErrorMessage(error.message);
      }
      return;
    }

    setInfoMessage(t("messages.updated"));
    setNewPassword("");
    setConfirmPassword("");
    setRedirectCountdown(3);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
          {t("brand")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("subtitle")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleReset}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="newPassword">
              {t("fields.newPassword")}
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              disabled={!isReady}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
              {t("fields.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={!isReady}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMessage}
              {redirectCountdown !== null ? ` ${t("messages.redirecting", { seconds: redirectCountdown })}` : ""}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || !isReady}
            className="flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {!isReady ? t("actions.verifying") : isSaving ? t("actions.saving") : t("actions.save")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link className="font-semibold text-violet-600 hover:text-violet-700" href="/login">
            {t("actions.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
