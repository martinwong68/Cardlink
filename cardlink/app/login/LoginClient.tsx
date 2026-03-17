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

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
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
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="app-card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center">
            <p className="app-kicker text-sm">
              {t("brand")}
            </p>
          </div>
          <div className="mt-3 flex justify-center">
            <LanguageSwitcher compact />
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-neutral-800">
            {t("title")}
          </h1>
          <p className="app-subtitle mt-2 text-sm">
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="email">
              {t("fields.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="app-input mt-2 px-3 py-2"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-neutral-700"
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
              className="app-input mt-2 px-3 py-2"
            />
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={isSendingReset}
              className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60"
            >
              {isSendingReset ? t("actions.sendingReset") : t("actions.forgotPassword")}
            </button>
          </div>

          {errorMessage ? (
            <p className="app-error px-3 py-2 text-sm">
              {errorMessage}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="app-success px-3 py-2 text-sm">
              {infoMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="app-primary-btn flex w-full items-center justify-center px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? t("actions.signingIn") : t("actions.signIn")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          {t("footer.newHere")} {" "}
          <Link
            className="font-semibold text-primary-600 hover:text-primary-700"
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
