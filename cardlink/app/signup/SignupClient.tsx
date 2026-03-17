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
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : null;

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
          <h1 className="mt-4 text-3xl font-semibold text-neutral-800">
            {t("title")}
          </h1>
          <p className="app-subtitle mt-2 text-sm">
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-sm font-medium text-neutral-700"
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

        <p className="mt-6 text-center text-sm text-neutral-500">
          {t("footer.haveAccount")} {" "}
          <Link
            className="font-semibold text-primary-600 hover:text-primary-700"
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
