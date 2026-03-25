"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Globe, Users, Lock, Plus, Trash2, Palette } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type VisibilityLevel = "public" | "all_users" | "members_only";

type Settings = {
  community_enabled: boolean;
  community_visibility: VisibilityLevel;
  store_visibility: VisibilityLevel;
};

type Subtopic = { name: string; description: string };

type ThemeData = {
  name: string;
  description: string;
  icon: string;
  subtopics: Subtopic[];
};

const VISIBILITY_OPTIONS: { value: VisibilityLevel; icon: typeof Globe }[] = [
  { value: "public", icon: Globe },
  { value: "all_users", icon: Users },
  { value: "members_only", icon: Lock },
];

const MAX_SUBTOPICS = 4;

export default function CommunitySettingsPage() {
  const t = useTranslations("communitySettings");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settings, setSettings] = useState<Settings>({
    community_enabled: false,
    community_visibility: "public",
    store_visibility: "public",
  });

  const [theme, setTheme] = useState<ThemeData>({
    name: "",
    description: "",
    icon: "",
    subtopics: [],
  });

  const load = useCallback(async () => {
    try {
      const [visRes, themeRes] = await Promise.all([
        fetch("/api/business/company-settings/visibility", {
          headers: HEADERS,
          cache: "no-store",
        }),
        fetch("/api/business/company-settings/community-theme", {
          headers: HEADERS,
          cache: "no-store",
        }),
      ]);
      if (visRes.ok) {
        const json = await visRes.json();
        setSettings({
          community_enabled: json.community_enabled ?? false,
          community_visibility: json.community_visibility ?? "public",
          store_visibility: json.store_visibility ?? "public",
        });
      }
      if (themeRes.ok) {
        const json = await themeRes.json();
        if (json.theme) {
          setTheme({
            name: json.theme.name ?? "",
            description: json.theme.description ?? "",
            icon: json.theme.icon ?? "",
            subtopics: (json.subtopics ?? []).map((st: { name?: string; description?: string }) => ({
              name: st.name ?? "",
              description: st.description ?? "",
            })),
          });
        }
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

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    setMessage(null);
    try {
      const res = await fetch("/api/business/company-settings/community-theme", {
        method: "PUT",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: theme.name,
          description: theme.description,
          icon: theme.icon,
          subtopics: theme.subtopics.filter((st) => st.name.trim()),
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t("themeSaved") });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error ?? t("error") });
      }
    } catch {
      setMessage({ type: "error", text: t("error") });
    } finally {
      setSavingTheme(false);
    }
  };

  const addSubtopic = () => {
    if (theme.subtopics.length >= MAX_SUBTOPICS) return;
    setTheme((prev) => ({
      ...prev,
      subtopics: [...prev.subtopics, { name: "", description: "" }],
    }));
  };

  const removeSubtopic = (idx: number) => {
    setTheme((prev) => ({
      ...prev,
      subtopics: prev.subtopics.filter((_, i) => i !== idx),
    }));
  };

  const updateSubtopic = (idx: number, field: "name" | "description", value: string) => {
    setTheme((prev) => ({
      ...prev,
      subtopics: prev.subtopics.map((st, i) =>
        i === idx ? { ...st, [field]: value } : st
      ),
    }));
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

      {/* Community Theme */}
      {settings.community_enabled && (
        <div className="app-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">{t("themeSection")}</h2>
          </div>
          <p className="text-[10px] text-gray-400">{t("themeHint")}</p>

          {/* Theme name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{t("themeName")}</label>
            <input
              value={theme.name}
              onChange={(e) => setTheme((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("themeNamePlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              maxLength={100}
            />
          </div>

          {/* Theme description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{t("themeDescription")}</label>
            <textarea
              value={theme.description}
              onChange={(e) => setTheme((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("themeDescriptionPlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Theme icon/emoji */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{t("themeIcon")}</label>
            <input
              value={theme.icon}
              onChange={(e) => setTheme((prev) => ({ ...prev, icon: e.target.value }))}
              placeholder="🏢"
              className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm text-center focus:border-indigo-400 focus:outline-none"
              maxLength={4}
            />
          </div>

          {/* Subtopics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">
                {t("subtopics")} ({theme.subtopics.length}/{MAX_SUBTOPICS})
              </label>
              {theme.subtopics.length < MAX_SUBTOPICS && (
                <button
                  onClick={addSubtopic}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-3 w-3" />
                  {t("addSubtopic")}
                </button>
              )}
            </div>

            {theme.subtopics.map((st, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={st.name}
                    onChange={(e) => updateSubtopic(idx, "name", e.target.value)}
                    placeholder={t("subtopicNamePlaceholder")}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                    maxLength={100}
                  />
                  <button
                    onClick={() => removeSubtopic(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={st.description}
                  onChange={(e) => updateSubtopic(idx, "description", e.target.value)}
                  placeholder={t("subtopicDescPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                  maxLength={300}
                />
              </div>
            ))}

            {theme.subtopics.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">{t("noSubtopics")}</p>
            )}
          </div>

          <button
            onClick={handleSaveTheme}
            disabled={savingTheme || !theme.name.trim()}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {savingTheme ? t("saving") : t("saveTheme")}
          </button>
        </div>
      )}

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
