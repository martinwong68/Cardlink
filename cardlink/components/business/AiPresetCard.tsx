"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  Check,
  X,
  Loader2,
  ListChecks,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

/* ── Types ── */

export type ActionStep = {
  label: string;
  module: string;
  operation: string;
  params: Record<string, unknown>;
};

export type AiQuestion = {
  id: string;
  question: string;
  options: string[];
  allowOther: boolean;
};

export type PresetCardData = {
  summary: string;
  actions: ActionStep[];
  questions: AiQuestion[];
};

export type PresetCardProps = {
  data: PresetCardData;
  onConfirm: (answers: Record<string, string>, finalActions: ActionStep[]) => Promise<void>;
  onCancel: () => void;
};

/* ── Main Component ── */
export default function AiPresetCard({ data, onConfirm, onCancel }: PresetCardProps) {
  const t = useTranslations("aiPresetCard");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const allQuestionsAnswered =
    data.questions.length === 0 ||
    data.questions.every((q) => {
      const ans = answers[q.id];
      if (!ans) return false;
      if (ans === "__other__") return (otherValues[q.id] ?? "").trim().length > 0;
      return true;
    });

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleOtherChange = (questionId: string, value: string) => {
    setOtherValues((prev) => ({ ...prev, [questionId]: value }));
  };

  const resolvedAnswers = (): Record<string, string> => {
    const resolved: Record<string, string> = {};
    for (const q of data.questions) {
      const ans = answers[q.id];
      resolved[q.id] = ans === "__other__" ? (otherValues[q.id] ?? "") : (ans ?? "");
    }
    return resolved;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(resolvedAnswers(), data.actions);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <Bot className="h-4 w-4 text-indigo-600" />
        <span className="text-xs font-semibold text-indigo-700">{t("title")}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm text-gray-800 leading-relaxed">{data.summary}</p>
        </div>

        {/* Action Steps */}
        {data.actions.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {t("actionsLabel")} ({data.actions.length})
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showDetails && (
              <div className="space-y-2">
                {data.actions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">{action.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {action.module} → {action.operation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Questions (multiple choice) */}
        {data.questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t("questionsLabel")}
              </span>
            </div>
            {data.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <p className="text-xs font-medium text-gray-700">{q.question}</p>
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        answers[q.id] === opt
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  {q.allowOther && (
                    <button
                      onClick={() => handleSelect(q.id, "__other__")}
                      className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
                        answers[q.id] === "__other__"
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {t("other")}
                    </button>
                  )}
                </div>
                {answers[q.id] === "__other__" && (
                  <input
                    type="text"
                    value={otherValues[q.id] ?? ""}
                    onChange={(e) => handleOtherChange(q.id, e.target.value)}
                    placeholder={t("otherPlaceholder")}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-gray-100" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !allQuestionsAnswered}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("executing")}
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                {t("confirm")}
              </>
            )}
          </button>
        </div>

        {!allQuestionsAnswered && data.questions.length > 0 && (
          <p className="text-[10px] text-amber-600 text-center">
            {t("answerAllQuestions")}
          </p>
        )}
      </div>
    </div>
  );
}
