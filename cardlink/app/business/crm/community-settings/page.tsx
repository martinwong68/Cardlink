"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Globe, Users, Lock } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type VisibilityLevel = "public" | "all_users" | "members_only";

type Settings = {
  community_enabled: boolean;
  community_visibility: VisibilityLevel;
  store_visibility: VisibilityLevel;
};

const VISIBILITY_OPTIONS: { value: VisibilityLevel; icon: typeof Globe }[] = [
  { value: "public", icon: Globe },
  { value: "all_users", icon: Users },
  { value: "members_only", icon: Lock },
];

export default function CommunitySettingsPage() {
  const t = useTranslations("communitySettings");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settings, setSettings] = useState<Settings>({
    community_enabled: false,
    community_visibility: "public",
    store_visibility: "public",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/business/company-settings/visibility", {
        headers: HEADERS,
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setSettings({
          community_enabled: json.community_enabled ?? false,
          community_visibility: json.community_visibility ?? "public",
          store_visibility: json.store_visibility ?? "public",
        });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/business/company-settings/visibility", {
        method: "PUT",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t("saved") });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error ?? t("error") });
      }
    } catch {
      setMessage({ type: "error", text: t("error") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/business/crm")}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Community Toggle */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{t("communitySection")}</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-600">{t("enableCommunity")}</span>
            <p className="text-[10px] text-gray-400">{t("enableCommunityHint")}</p>
          </div>
          <button
            onClick={() =>
              setSettings((s) => ({ ...s, community_enabled: !s.community_enabled }))
            }
            className={`h-5 w-9 rounded-full transition-colors ${settings.community_enabled ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.community_enabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        {settings.community_enabled && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              {t("communityVisibility")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = settings.community_visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setSettings((s) => ({ ...s, community_visibility: opt.value }))
                    }
                    className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${selected ? "text-indigo-600" : "text-gray-400"}`} />
                    <span
                      className={`text-[10px] font-medium ${selected ? "text-indigo-700" : "text-gray-500"}`}
                    >
                      {t(`visibility.${opt.value}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Store Visibility */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{t("storeSection")}</h2>
        <p className="text-[10px] text-gray-400">{t("storeVisibilityHint")}</p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">{t("storeVisibility")}</label>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = settings.store_visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    setSettings((s) => ({ ...s, store_visibility: opt.value }))
                  }
                  className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${selected ? "text-indigo-600" : "text-gray-400"}`} />
                  <span
                    className={`text-[10px] font-medium ${selected ? "text-indigo-700" : "text-gray-500"}`}
                  >
                    {t(`visibility.${opt.value}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="app-card rounded-2xl p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">{t("itemVisibilitySection")}</h2>
        <p className="text-xs text-gray-500">{t("itemVisibilityHint")}</p>
      </div>

      {message && (
        <p
          className={`text-xs text-center ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="app-primary-btn w-full disabled:opacity-50"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
