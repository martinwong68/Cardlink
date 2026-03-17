"use client";

import { useState } from "react";
import { Eye, EyeOff, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type Visibility = "public" | "friends" | "hidden";

export default function PrivacySettingsPage() {
  const t = useTranslations("privacy");
  const options = [
    { value: "public", label: t("options.public"), icon: Eye },
    { value: "friends", label: t("options.friends"), icon: Users },
    { value: "hidden", label: t("options.hidden"), icon: EyeOff },
  ] as const;
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(
    "public"
  );
  const [showInSearch, setShowInSearch] = useState(true);
  const [allowRequests, setAllowRequests] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            {t("defaultVisibility.title")}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {t("defaultVisibility.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              const active = defaultVisibility === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setDefaultVisibility(option.value)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-primary-600 text-white"
                      : "border border-neutral-100 text-neutral-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {t("search.title")}
              </p>
              <p className="text-xs text-neutral-500">
                {t("search.subtitle")}
              </p>
            </div>
            <button
              onClick={() => setShowInSearch((prev) => !prev)}
              className={`h-6 w-11 rounded-full border transition ${
                showInSearch
                  ? "border-primary-600 bg-primary-600"
                  : "border-neutral-100 bg-neutral-100"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  showInSearch ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {t("requests.title")}
              </p>
              <p className="text-xs text-neutral-500">
                {t("requests.subtitle")}
              </p>
            </div>
            <button
              onClick={() => setAllowRequests((prev) => !prev)}
              className={`h-6 w-11 rounded-full border transition ${
                allowRequests
                  ? "border-primary-600 bg-primary-600"
                  : "border-neutral-100 bg-neutral-100"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  allowRequests ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
