"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type CompanyOption = {
  id: string;
  name: string;
  slug: string | null;
  access_role?: string;
};

type MainAccountResponse = {
  eligible: boolean;
  isMasterUser: boolean;
  isMasterUserInDb: boolean;
  activeCompanyId: string | null;
  managedCompanies: CompanyOption[];
};

export default function BusinessMainAccountSettingsPage() {
  const t = useTranslations("businessMainAccount");
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [isMasterUserInDb, setIsMasterUserInDb] = useState(false);
  const [managedCompanies, setManagedCompanies] = useState<CompanyOption[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage(t("messages.signInRequired"));
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/business/main-account", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setMessage(t("messages.loadFailed"));
        setIsLoading(false);
        return;
      }

      const data = (await response.json()) as MainAccountResponse;
      setEligible(data.eligible);
      setIsMasterUser(data.isMasterUser);
      setIsMasterUserInDb(data.isMasterUserInDb);
      setManagedCompanies(data.managedCompanies ?? []);
      setActiveCompanyId(data.activeCompanyId ?? "");
      setIsLoading(false);
    };

    void load();
  }, [supabase, t]);

  const handleSave = async () => {
    if (!activeCompanyId) {
      setMessage(t("messages.selectCompany"));
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const response = await fetch("/api/business/main-account", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ activeCompanyId }),
    });

    setIsSaving(false);

    if (!response.ok) {
      setMessage(t("messages.saveFailed"));
      return;
    }

    setMessage(t("messages.saved"));
  };

  const handleQuickSwitch = async (companyId: string) => {
    setActiveCompanyId(companyId);
    setIsSaving(true);
    setMessage(null);

    const response = await fetch("/api/business/main-account", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ activeCompanyId: companyId }),
    });

    setIsSaving(false);

    if (!response.ok) {
      setMessage(t("messages.saveFailed"));
      return;
    }

    setMessage(t("messages.saved"));
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">{t("states.loading")}</p>;
  }

  if (!eligible) {
    return <p className="app-error px-3 py-2 text-sm">{t("messages.notEligible")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="app-card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {isMasterUser ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">
              {t("badges.masterRuntime")}
            </span>
          ) : null}
          {isMasterUserInDb ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              {t("badges.masterDb")}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700" htmlFor="active-company">
            {t("fields.activeCompany")}
          </label>
          <select
            id="active-company"
            value={activeCompanyId}
            onChange={(event) => setActiveCompanyId(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
          >
            <option value="">{t("fields.selectPlaceholder")}</option>
            {managedCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">{t("fields.quickSwitch")}</p>
          <div className="flex flex-wrap gap-2">
            {managedCompanies.map((company) => {
              const isActive = company.id === activeCompanyId;
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => void handleQuickSwitch(company.id)}
                  disabled={isSaving || isActive}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  {isActive ? t("states.activeTag", { company: company.name }) : company.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-700">{t("fields.permissionScope")}</p>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {managedCompanies.map((company) => (
              <li key={company.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{company.name}</span>
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 ring-1 ring-gray-200">
                  {company.access_role ?? (isMasterUser ? "master" : "admin")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isSaving ? t("actions.saving") : t("actions.save")}
        </button>

        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </div>
    </div>
  );
}
