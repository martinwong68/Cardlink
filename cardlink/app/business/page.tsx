"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Handshake,
  ClipboardList,
  CreditCard,
  Store,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Eye,
  Info,
  Boxes,
} from "lucide-react";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import { notifyInvoiceOverdue } from "@/src/lib/business-notifications";
import { runBusinessRules } from "@/src/lib/ai-rule-engine";
import AiActionCard, { type AiActionCardData } from "@/components/business/AiActionCard";

const modules = [
  { key: "accounting" as const, icon: BookOpen, color: "bg-blue-50 text-blue-600", route: "/business/accounting", exists: true, moduleName: "accounting" },
  { key: "store" as const, icon: Store, color: "bg-indigo-50 text-indigo-600", route: "/business/store-management", exists: true, moduleName: "store" },
  { key: "hr" as const, icon: Users, color: "bg-purple-50 text-purple-600", route: "/business/hr", exists: true, moduleName: "hr" },
  { key: "booking" as const, icon: Calendar, color: "bg-teal-50 text-teal-600", route: "/business/booking", exists: true, moduleName: "booking" },
  { key: "inventory" as const, icon: Package, color: "bg-orange-50 text-orange-600", route: "/business/inventory", exists: true, moduleName: "inventory" },
  { key: "pos" as const, icon: ShoppingCart, color: "bg-green-50 text-green-600", route: "/business/pos", exists: true, moduleName: "pos" },
  { key: "crm" as const, icon: Handshake, color: "bg-indigo-50 text-indigo-600", route: "/business/crm", exists: true, moduleName: "crm" },
  { key: "procurement" as const, icon: ClipboardList, color: "bg-amber-50 text-amber-600", route: "/business/procurement", exists: true, moduleName: "procurement" },
  { key: "companyCards" as const, icon: CreditCard, color: "bg-slate-100 text-slate-600", route: "/business/company-cards", exists: true, moduleName: "cards" },
  { key: "items" as const, icon: Boxes, color: "bg-cyan-50 text-cyan-600", route: "/business/items", exists: true, moduleName: "items" },
];

export default function BusinessHandlePage() {
  const t = useTranslations("businessHandle");
  const { companyId, loading, supabase } = useActiveCompany();

  /* ── AI Action Cards state ── */
  const [actionCards, setActionCards] = useState<AiActionCardData[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [moduleStats, setModuleStats] = useState<Record<string, number>>({});
  const [enabledModules, setEnabledModules] = useState<Set<string> | null>(null);

  const fetchActionCards = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("ai_action_cards")
      .select("id, card_type, title, description, suggested_data, status, confidence_score, source_module")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setActionCards((data as AiActionCardData[]) ?? []);
    setLoadingCards(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!loading && companyId) {
      void fetchActionCards();
      // Run business rules engine (throttled to once per hour)
      void (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newCards = await runBusinessRules(companyId, user.id);
          if (newCards > 0) void fetchActionCards();
        }
      })();
    }
  }, [loading, companyId, fetchActionCards, supabase]);

  /* ── Fetch enabled modules from company_modules ── */
  useEffect(() => {
    if (loading || !companyId) return;
    (async () => {
      const { data } = await supabase
        .from("company_modules")
        .select("module_name, is_enabled")
        .eq("company_id", companyId);
      if (data && data.length > 0) {
        const enabled = new Set(
          (data as { module_name: string; is_enabled: boolean }[])
            .filter((m) => m.is_enabled)
            .map((m) => m.module_name)
        );
        setEnabledModules(enabled);
      } else {
        /* No module config → show all modules (default) */
        setEnabledModules(null);
      }
    })();
  }, [loading, companyId, supabase]);

  /* ── Module stats ── */
  useEffect(() => {
    if (loading || !companyId) return;
    (async () => {
      const stats: Record<string, number> = {};

      // Accounting: pending transactions
      const { count: pendingTxns } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", companyId)
        .eq("status", "pending");
      if (pendingTxns) stats.accounting = pendingTxns;

      // Inventory: low stock items
      const { data: products } = await supabase
        .from("inv_products")
        .select("id, reorder_level")
        .eq("company_id", companyId)
        .eq("is_active", true);
      if (products && products.length > 0) {
        const pIds = (products as { id: string }[]).map((p) => p.id);
        const { data: balances } = await supabase
          .from("inv_stock_balances")
          .select("product_id, on_hand")
          .in("product_id", pIds);
        const balMap = new Map(
          ((balances ?? []) as { product_id: string; on_hand: number }[]).map((b) => [b.product_id, b.on_hand])
        );
        const lowCount = (products as { id: string; reorder_level: number }[])
          .filter((p) => (balMap.get(p.id) ?? 0) <= p.reorder_level).length;
        if (lowCount > 0) stats.inventory = lowCount;
      }

      setModuleStats(stats);
    })();
  }, [loading, companyId, supabase]);

  /* ── Action handlers (via execution API) ── */
  const handleApprove = async (cardId: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "approve" }),
    });
    if (res.ok) {
      setActionCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  };

  const handleReject = async (cardId: string, reason?: string) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "reject", reason }),
    });
    if (res.ok) {
      setActionCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  };

  const handleAmend = async (cardId: string, amendedData: Record<string, unknown>) => {
    const res = await fetch("/api/business/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action: "amend", amendedData }),
    });
    if (res.ok) {
      setActionCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  };

  /* ── Group cards by priority ── */
  const urgentCards = actionCards.filter(
    (c) => (c.confidence_score ?? 0) > 0.9 && ["journal_entry", "invoice", "expense"].includes(c.card_type),
  );
  const infoCards = actionCards.filter(
    (c) => ["navigation", "report", "general"].includes(c.card_type),
  );
  const reviewCards = actionCards.filter(
    (c) => !urgentCards.includes(c) && !infoCards.includes(c),
  );

  // Check for overdue invoices and plan renewal on dashboard load
  useEffect(() => {
    if (loading || !companyId) return;

    const checkOverdueInvoices = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch overdue invoices
      const now = new Date().toISOString().slice(0, 10);
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, due_date")
        .eq("org_id", companyId)
        .lt("due_date", now)
        .neq("status", "paid")
        .limit(10);

      if (overdueInvoices && overdueInvoices.length > 0) {
        for (const inv of overdueInvoices) {
          const daysOverdue = Math.floor(
            (Date.now() - new Date(inv.due_date as string).getTime()) / (1000 * 60 * 60 * 24)
          );

          // Deduplicate: check if we already notified about this invoice in last 24h
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from("business_notifications")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .eq("type", "invoice_overdue")
            .eq("related_entity_id", inv.id)
            .gte("created_at", since);

          if ((count ?? 0) === 0) {
            await notifyInvoiceOverdue(
              companyId,
              user.id,
              inv.id as string,
              inv.invoice_number as string,
              daysOverdue
            );
          }
        }
      }

      // Check plan renewal
      const { data: sub } = await supabase
        .from("company_subscriptions")
        .select("current_period_end")
        .eq("company_id", companyId)
        .maybeSingle();

      if (sub?.current_period_end) {
        const periodEnd = new Date(sub.current_period_end as string);
        const daysUntil = Math.ceil(
          (periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil > 0 && daysUntil <= 7) {
          // Check if already notified for this period
          const periodKey = (sub.current_period_end as string).slice(0, 10);
          const { count: renewalCount } = await supabase
            .from("business_notifications")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .eq("type", "system")
            .contains("metadata", { renewal_period: periodKey });

          if ((renewalCount ?? 0) === 0) {
            await supabase.from("business_notifications").insert({
              company_id: companyId,
              user_id: user.id,
              type: "system",
              title: `Your plan renews in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
              metadata: { renewal_period: periodKey },
              priority: "info",
            });
          }
        }
      }
    };

    void checkOverdueInvoices();
  }, [loading, companyId, supabase]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* AI Action Queue */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-800">{t("aiSuggestions.title")}</h2>
            {actionCards.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                {actionCards.length}
              </span>
            )}
          </div>
          {actionCards.length > 0 && (
            <Link href="/business/action-cards" className="text-[10px] text-indigo-600 font-medium hover:underline">
              {t("aiSuggestions.viewAll")} →
            </Link>
          )}
        </div>
        {loadingCards ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : actionCards.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl bg-gray-50 py-8 px-4 text-center">
            <p className="text-xs text-gray-400">{t("aiSuggestions.empty")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Urgent group */}
            {urgentCards.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">
                    {t("aiSuggestions.urgent")} ({urgentCards.length})
                  </span>
                </div>
                <div className="space-y-1 rounded-xl border border-red-100 bg-red-50/30 p-2">
                  {urgentCards.map((card) => (
                    <AiActionCard key={card.id} card={card} onApprove={handleApprove} onReject={handleReject} onAmend={handleAmend} compact />
                  ))}
                </div>
              </div>
            )}
            {/* Review group */}
            {reviewCards.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                    {t("aiSuggestions.review")} ({reviewCards.length})
                  </span>
                </div>
                <div className="space-y-1 rounded-xl border border-amber-100 bg-amber-50/30 p-2">
                  {reviewCards.map((card) => (
                    <AiActionCard key={card.id} card={card} onApprove={handleApprove} onReject={handleReject} onAmend={handleAmend} compact />
                  ))}
                </div>
              </div>
            )}
            {/* Info group */}
            {infoCards.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                    {t("aiSuggestions.info")} ({infoCards.length})
                  </span>
                </div>
                <div className="space-y-1 rounded-xl border border-green-100 bg-green-50/30 p-2">
                  {infoCards.map((card) => (
                    <AiActionCard key={card.id} card={card} onApprove={handleApprove} onReject={handleReject} onAmend={handleAmend} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("modules")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {modules
            .filter((mod) => {
              /* If no module config exists (null), show all modules by default */
              if (enabledModules === null) return true;
              /* Otherwise only show modules that are enabled */
              return enabledModules.has(mod.moduleName);
            })
            .map((mod) => {
            const Icon = mod.icon;
            const href = mod.exists ? mod.route : `/business/${mod.key}`;
            return (
              <Link
                key={mod.key}
                href={href}
                className="app-card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {t(`moduleNames.${mod.key}`)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 transition" />
                </div>
                {moduleStats[mod.key] != null && moduleStats[mod.key] > 0 && (
                  <span className="inline-flex self-start rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">
                    {t("moduleStats.pending", { count: moduleStats[mod.key] })}
                  </span>
                )}
                {!mod.exists && (
                  <span className="inline-flex self-start rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {t("comingSoon")}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
