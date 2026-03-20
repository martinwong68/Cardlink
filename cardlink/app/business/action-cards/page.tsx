"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ListFilter,
  AlertCircle,
  Eye,
  Info,
  Check,
  X,
  Trash2,
  ArrowUpDown,
  Clock,
  Sparkles,
  User,
  MessageSquare,
} from "lucide-react";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import AiActionCard, { type AiActionCardData } from "@/components/business/AiActionCard";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "amended";
type SortOption = "newest" | "oldest" | "confidence";

type ActionCardRow = AiActionCardData & {
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  feedback_note?: string;
};

export default function ActionCardsPage() {
  const t = useTranslations("actionCardQueue");
  const { companyId, loading, supabase } = useActiveCompany();

  const [cards, setCards] = useState<ActionCardRow[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  /* ── Stats ── */
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedWeek, setApprovedWeek] = useState(0);
  const [rejectedWeek, setRejectedWeek] = useState(0);

  /* ── Bulk loading ── */
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!companyId) return;

    const { count: pending } = await supabase
      .from("ai_action_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending");
    setPendingCount(pending ?? 0);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: approved } = await supabase
      .from("ai_action_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "approved")
      .gte("approved_at", weekAgo);
    setApprovedWeek(approved ?? 0);

    const { count: rejected } = await supabase
      .from("ai_action_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "rejected")
      .gte("approved_at", weekAgo);
    setRejectedWeek(rejected ?? 0);
  }, [companyId, supabase]);

  const fetchCards = useCallback(async () => {
    if (!companyId) return;
    setLoadingCards(true);

    let query = supabase
      .from("ai_action_cards")
      .select("id, card_type, title, description, suggested_data, status, confidence_score, source_module, created_at, approved_by, approved_at, feedback_note")
      .eq("company_id", companyId)
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (sortOption === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortOption === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("confidence_score", { ascending: false, nullsFirst: false });
    }

    const { data } = await query;
    setCards((data as ActionCardRow[]) ?? []);
    setLoadingCards(false);
  }, [companyId, supabase, statusFilter, sortOption]);

  useEffect(() => {
    if (!loading && companyId) {
      void fetchStats();
      void fetchCards();
    }
  }, [loading, companyId, fetchStats, fetchCards]);

  /* ── Priority grouping (only for pending tab) ── */
  const urgentCards = cards.filter(
    (c) => (c.confidence_score ?? 0) > 0.9 && ["journal_entry", "invoice", "expense"].includes(c.card_type),
  );
  const infoCards = cards.filter(
    (c) => ["navigation", "report", "general"].includes(c.card_type),
  );
  const reviewCards = cards.filter(
    (c) => !urgentCards.includes(c) && !infoCards.includes(c),
  );

  /* ── Action handlers ── */
  const handleApprove = async (cardId: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "approve" }),
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setPendingCount((c) => Math.max(0, c - 1));
      setApprovedWeek((c) => c + 1);
    }
  };

  const handleReject = async (cardId: string, reason?: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "reject", reason }),
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setPendingCount((c) => Math.max(0, c - 1));
      setRejectedWeek((c) => c + 1);
    }
  };

  const handleAmend = async (cardId: string, amendedData: Record<string, unknown>) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "amend", amendedData }),
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setPendingCount((c) => Math.max(0, c - 1));
    }
  };

  /* ── Bulk actions ── */
  const handleBulkApprove = async (group: "urgent" | "review" | "info") => {
    const groupCards = group === "urgent" ? urgentCards : group === "review" ? reviewCards : infoCards;
    if (groupCards.length === 0) return;
    if (!confirm(t("bulkApproveConfirm", { count: groupCards.length }))) return;

    setBulkLoading(group);
    const ids = groupCards.map((c) => c.id);
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardIds: ids, action: "approve" }),
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => !ids.includes(c.id)));
      setPendingCount((c) => Math.max(0, c - ids.length));
      setApprovedWeek((c) => c + ids.length);
    }
    setBulkLoading(null);
  };

  const handleBulkDismiss = async (group: "urgent" | "review" | "info") => {
    const groupCards = group === "urgent" ? urgentCards : group === "review" ? reviewCards : infoCards;
    if (groupCards.length === 0) return;
    if (!confirm(t("bulkDismissConfirm", { count: groupCards.length }))) return;

    setBulkLoading(group);
    const ids = groupCards.map((c) => c.id);
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardIds: ids, action: "reject", reason: "Bulk dismissed" }),
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => !ids.includes(c.id)));
      setPendingCount((c) => Math.max(0, c - ids.length));
      setRejectedWeek((c) => c + ids.length);
    }
    setBulkLoading(null);
  };

  /* ── Filters ── */
  const filters: { key: StatusFilter; icon: typeof ListFilter; label: string }[] = [
    { key: "all", icon: ListFilter, label: t("filter.all") },
    { key: "pending", icon: Clock, label: t("filter.pending") },
    { key: "approved", icon: Check, label: t("filter.approved") },
    { key: "rejected", icon: X, label: t("filter.rejected") },
    { key: "amended", icon: Eye, label: t("filter.amended") },
  ];

  /* ── Utility for timestamp display ── */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  /* ── Priority group renderer with bulk actions ── */
  const renderPriorityGroup = (
    groupKey: "urgent" | "review" | "info",
    groupCards: ActionCardRow[],
    icon: React.ReactNode,
    labelKey: string,
    borderColor: string,
    bgColor: string,
  ) => {
    if (groupCards.length === 0) return null;
    return (
      <div key={groupKey}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {t(labelKey)} ({groupCards.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleBulkApprove(groupKey)}
              disabled={bulkLoading === groupKey}
              className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 transition disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {t("approveAll")}
            </button>
            <button
              onClick={() => handleBulkDismiss(groupKey)}
              disabled={bulkLoading === groupKey}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {t("dismissAll")}
            </button>
          </div>
        </div>
        <div className={`space-y-3 rounded-2xl border ${borderColor} ${bgColor} p-3`}>
          {groupCards.map((card) => (
            <AiActionCard
              key={card.id}
              card={card}
              onApprove={handleApprove}
              onReject={handleReject}
              onAmend={handleAmend}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/business"
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-800">{t("title")}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{pendingCount}</span>
          <span className="text-[10px] text-amber-600">{t("stats.pending")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs font-semibold text-green-700">{approvedWeek}</span>
          <span className="text-[10px] text-green-600">{t("stats.approvedWeek")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
          <X className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-semibold text-red-700">{rejectedWeek}</span>
          <span className="text-[10px] text-red-600">{t("stats.rejectedWeek")}</span>
        </div>
      </div>

      {/* Filter tabs + Sort */}
      <div className="flex items-center justify-between gap-3">
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
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative shrink-0">
          <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="appearance-none rounded-lg border border-gray-200 bg-white pl-7 pr-6 py-1.5 text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="newest">{t("sort.newest")}</option>
            <option value="oldest">{t("sort.oldest")}</option>
            <option value="confidence">{t("sort.confidence")}</option>
          </select>
        </div>
      </div>

      {/* Cards list */}
      {loadingCards ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : cards.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <Sparkles className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">{t("empty")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("emptyDesc")}</p>
        </div>
      ) : statusFilter === "pending" ? (
        /* ── Grouped pending view ── */
        <div className="space-y-6">
          {renderPriorityGroup(
            "urgent",
            urgentCards,
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
            "group.urgent",
            "border-red-100",
            "bg-red-50/30",
          )}
          {renderPriorityGroup(
            "review",
            reviewCards,
            <Eye className="h-3.5 w-3.5 text-amber-500" />,
            "group.review",
            "border-amber-100",
            "bg-amber-50/30",
          )}
          {renderPriorityGroup(
            "info",
            infoCards,
            <Info className="h-3.5 w-3.5 text-green-500" />,
            "group.info",
            "border-green-100",
            "bg-green-50/30",
          )}
        </div>
      ) : (
        /* ── Flat list for non-pending tabs ── */
        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.id} className="space-y-1">
              <AiActionCard
                card={card}
                onApprove={handleApprove}
                onReject={handleReject}
                onAmend={handleAmend}
              />
              {/* Extra info for resolved cards */}
              {card.status !== "pending" && (
                <div className="flex items-center gap-3 px-4 pb-1">
                  {card.approved_at && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(card.approved_at)}
                    </span>
                  )}
                  {card.approved_by && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <User className="h-3 w-3" />
                      {card.approved_by.slice(0, 8)}…
                    </span>
                  )}
                  {card.feedback_note && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MessageSquare className="h-3 w-3" />
                      {card.feedback_note}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
