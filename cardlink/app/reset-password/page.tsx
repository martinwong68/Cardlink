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
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="app-card w-full max-w-md p-8">
        <p className="app-kicker text-sm">
          {t("brand")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleReset}>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="newPassword">
              {t("fields.newPassword")}
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              disabled={!isReady}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="app-input mt-2 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">
              {t("fields.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={!isReady}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="app-input mt-2 px-3 py-2"
            />
          </div>

          {errorMessage ? (
            <p className="app-error px-3 py-2 text-sm">
              {errorMessage}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="app-success px-3 py-2 text-sm">
              {infoMessage}
              {redirectCountdown !== null ? ` ${t("messages.redirecting", { seconds: redirectCountdown })}` : ""}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || !isReady}
            className="app-primary-btn flex w-full items-center justify-center px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {!isReady ? t("actions.verifying") : isSaving ? t("actions.saving") : t("actions.save")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/login">
            {t("actions.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
