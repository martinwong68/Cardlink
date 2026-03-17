"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

export default function PasswordSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("passwordSettings");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage(t("errors.passwordLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("errors.passwordNotMatch"));
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setInfoMessage(t("messages.updated"));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="newPassword">
            {t("fields.newPassword")}
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-100 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
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
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-100 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
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
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? t("actions.saving") : t("actions.save")}
        </button>
      </form>
    </div>
  );
}
