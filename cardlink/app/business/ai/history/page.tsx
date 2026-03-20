"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  History,
  Filter,
  Check,
  X,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import AiActionCard, { type AiActionCardData } from "@/components/business/AiActionCard";

type StatusFilter = "all" | "approved" | "amended" | "rejected" | "pending";

export default function AiHistoryPage() {
  const t = useTranslations("aiHistory");
  const { companyId, loading, supabase } = useActiveCompany();

  const [cards, setCards] = useState<AiActionCardData[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchCards = useCallback(async () => {
    if (!companyId) return;
    let query = supabase
      .from("ai_action_cards")
      .select("id, card_type, title, description, suggested_data, status, confidence_score, source_module")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setCards((data as AiActionCardData[]) ?? []);
    setLoadingCards(false);
  }, [companyId, supabase, statusFilter]);

  useEffect(() => {
    if (!loading && companyId) {
      setLoadingCards(true);
      void fetchCards();
    }
  }, [loading, companyId, fetchCards]);

  /* ── Action handlers ── */
  const handleApprove = async (cardId: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "approve" }),
    });
    if (res.ok) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: "approved" } : c))
      );
    }
  };

  const handleReject = async (cardId: string, reason?: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "reject", reason }),
    });
    if (res.ok) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: "rejected" } : c))
      );
    }
  };

  const handleAmend = async (cardId: string, amendedData: Record<string, unknown>) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "amend", amendedData }),
    });
    if (res.ok) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, status: "amended", suggested_data: amendedData } : c
        )
      );
    }
  };

  const filters: { key: StatusFilter; icon: typeof Filter; color: string }[] = [
    { key: "all", icon: Filter, color: "text-gray-600 bg-gray-100" },
    { key: "pending", icon: Filter, color: "text-indigo-600 bg-indigo-50" },
    { key: "approved", icon: Check, color: "text-green-600 bg-green-50" },
    { key: "amended", icon: Pencil, color: "text-amber-600 bg-amber-50" },
    { key: "rejected", icon: X, color: "text-red-600 bg-red-50" },
  ];

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
          href="/business/ai"
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-800">{t("title")}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(`filter.${f.key}`)}
            </button>
          );
        })}
      </div>

      {/* Cards list */}
      {loadingCards ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : cards.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <History className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <AiActionCard
              key={card.id}
              card={card}
              onApprove={handleApprove}
              onReject={handleReject}
              onAmend={handleAmend}
            />
          ))}
        </div>
      )}
    </div>
  );
}
