"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createClient } from "@/src/lib/supabase/client";

export default function SignupClient() {
  const supabase = createClient();
  const t = useTranslations("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo ?? "/dashboard/community")}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setErrorMessage(error.message);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(t("messages.checkEmail"));
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
          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            {t("title")}
          </h1>
          <p className="app-subtitle mt-2 text-sm">
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Google Sign Up */}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isGoogleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or</span></div>
          </div>

          <div>
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="fullName"
            >
              {t("fields.fullName")}
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="app-input mt-2 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="email">
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
              className="text-sm font-medium text-gray-700"
              htmlFor="password"
            >
              {t("fields.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="app-input mt-2 px-3 py-2"
            />
          </div>

          {errorMessage ? (
            <p className="app-error px-3 py-2 text-sm">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="app-success px-3 py-2 text-sm">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="app-primary-btn flex w-full items-center justify-center px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? t("actions.creating") : t("actions.create")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("footer.haveAccount")} {" "}
          <Link
            className="font-semibold text-indigo-600 hover:text-indigo-700"
            href={
              returnTo
                ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                : "/login"
            }
          >
            {t("actions.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
