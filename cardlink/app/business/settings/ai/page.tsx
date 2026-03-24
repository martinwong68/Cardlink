"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  ChevronLeft,
  Sparkles,
  Languages,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

import { useActiveCompany } from "@/components/business/useActiveCompany";

type AiModel = "claude-haiku-4.5" | "claude-sonnet-4.6" | "claude-opus-4.6";
type AiPersonality = "formal" | "casual";

type FeedbackStats = {
  total: number;
  approved: number;
  rejected: number;
  amended: number;
  topReasons: Array<{ reason: string; count: number }>;
};

export default function AiPreferencesSettingsPage() {
  const t = useTranslations("aiSettings");
  const { companyId, loading, supabase } = useActiveCompany();

  /* ── Preferences state ── */
  const [model, setModel] = useState<AiModel>("claude-haiku-4.5");
  const [language, setLanguage] = useState("en");
  const [personality, setPersonality] = useState<AiPersonality>("formal");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── Stats ── */
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    amended: 0,
    topReasons: [],
  });

  /* ── Load preferences ── */
  useEffect(() => {
    if (loading || !companyId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from("profiles")
        .select("ai_model, ai_language, ai_personality")
        .eq("id", user.id)
        .maybeSingle();

      if (prefs) {
        if (prefs.ai_model) setModel(prefs.ai_model as AiModel);
        if (prefs.ai_language) setLanguage(prefs.ai_language as string);
        if (prefs.ai_personality) setPersonality(prefs.ai_personality as AiPersonality);
      }
    })();
  }, [loading, companyId, supabase]);

  /* ── Load feedback stats ── */
  const fetchStats = useCallback(async () => {
    if (!companyId) return;

    const { count: total } = await supabase
      .from("ai_card_feedback")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const { count: approved } = await supabase
      .from("ai_card_feedback")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("feedback_type", "approved");

    const { count: rejected } = await supabase
      .from("ai_card_feedback")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("feedback_type", "rejected");

    const { count: amended } = await supabase
      .from("ai_card_feedback")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("feedback_type", "amended");

    // Top rejection reasons
    const { data: rejections } = await supabase
      .from("ai_card_feedback")
      .select("rejection_reason")
      .eq("company_id", companyId)
      .eq("feedback_type", "rejected")
      .not("rejection_reason", "is", null)
      .limit(100);

    const reasonCounts = new Map<string, number>();
    for (const row of rejections ?? []) {
      const reason = (row.rejection_reason as string) ?? "Unknown";
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));

    setStats({
      total: total ?? 0,
      approved: approved ?? 0,
      rejected: rejected ?? 0,
      amended: amended ?? 0,
      topReasons,
    });
  }, [companyId, supabase]);

  useEffect(() => {
    if (!loading && companyId) void fetchStats();
  }, [loading, companyId, fetchStats]);

  /* ── Save preferences ── */
  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          ai_model: model,
          ai_language: language,
          ai_personality: personality,
        })
        .eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const approvalPct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const rejectedPct = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;
  const amendedPct = stats.total > 0 ? Math.round((stats.amended / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/business/settings"
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" />
            <h1 className="text-lg font-semibold text-gray-800">{t("title")}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {/* ── Default Model Selector ── */}
      <div className="app-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("model.title")}</h2>
        </div>
        <p className="text-xs text-gray-500">{t("model.desc")}</p>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as AiModel)}
          className="app-input text-sm"
        >
          <option value="claude-haiku-4.5">Claude Haiku 4.5 (Fast)</option>
          <option value="claude-sonnet-4.6">Claude Sonnet 4.6 (Balanced)</option>
          <option value="claude-opus-4.6">Claude Opus 4.6 (Advanced)</option>
        </select>
      </div>

      {/* ── AI Language ── */}
      <div className="app-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("language.title")}</h2>
        </div>
        <p className="text-xs text-gray-500">{t("language.desc")}</p>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="app-input text-sm"
        >
          <option value="en">English</option>
          <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
          <option value="zh-CN">简体中文 (Simplified Chinese)</option>
          <option value="zh-HK">廣東話 (Cantonese)</option>
        </select>
      </div>

      {/* ── AI Personality ── */}
      <div className="app-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-teal-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("personality.title")}</h2>
        </div>
        <p className="text-xs text-gray-500">{t("personality.desc")}</p>
        <div className="flex gap-3">
          {(["formal", "casual"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPersonality(p)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                personality === p
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(`personality.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="app-primary-btn w-full py-3 text-sm font-medium disabled:opacity-50"
      >
        {saved ? t("saved") : saving ? t("saving") : t("save")}
      </button>

      {/* ── AI Performance Stats ── */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("performance.title")}</h2>
        </div>

        {stats.total === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t("performance.noData")}</p>
        ) : (
          <>
            {/* Stat cards grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{t("performance.totalCards")}</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                <p className="text-[10px] text-green-600 mt-0.5">
                  {t("performance.approved")} ({approvalPct}%)
                </p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                <p className="text-[10px] text-red-600 mt-0.5">
                  {t("performance.rejected")} ({rejectedPct}%)
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats.amended}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {t("performance.amended")} ({amendedPct}%)
                </p>
              </div>
            </div>

            {/* Ratio bar */}
            <div>
              <p className="text-[10px] text-gray-500 mb-1.5">{t("performance.ratio")}</p>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {approvalPct > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${approvalPct}%` }}
                  />
                )}
                {amendedPct > 0 && (
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${amendedPct}%` }}
                  />
                )}
                {rejectedPct > 0 && (
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${rejectedPct}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {t("performance.approved")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {t("performance.amended")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  {t("performance.rejected")}
                </span>
              </div>
            </div>

            {/* Top rejection reasons */}
            {stats.topReasons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t("performance.topReasons")}
                </p>
                <div className="space-y-1.5">
                  {stats.topReasons.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2"
                    >
                      <span className="text-xs text-red-700">{r.reason}</span>
                      <span className="text-xs font-semibold text-red-600">×{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
