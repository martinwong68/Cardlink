"use client";

import { useEffect } from "react";
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
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import { notifyInvoiceOverdue } from "@/src/lib/business-notifications";

const modules = [
  { key: "accounting" as const, icon: BookOpen, color: "bg-blue-50 text-blue-600", route: "/business/accounting", exists: true },
  { key: "hr" as const, icon: Users, color: "bg-purple-50 text-purple-600", route: "/business/hr", exists: false },
  { key: "booking" as const, icon: Calendar, color: "bg-teal-50 text-teal-600", route: "/business/booking", exists: false },
  { key: "inventory" as const, icon: Package, color: "bg-orange-50 text-orange-600", route: "/business/inventory", exists: true },
  { key: "pos" as const, icon: ShoppingCart, color: "bg-green-50 text-green-600", route: "/business/pos", exists: true },
  { key: "crm" as const, icon: Handshake, color: "bg-indigo-50 text-indigo-600", route: "/business/crm", exists: true },
  { key: "procurement" as const, icon: ClipboardList, color: "bg-amber-50 text-amber-600", route: "/business/procurement", exists: true },
  { key: "companyCards" as const, icon: CreditCard, color: "bg-slate-100 text-slate-600", route: "/business/company-cards", exists: true },
];

export default function BusinessHandlePage() {
  const t = useTranslations("businessHandle");
  const { companyId, loading, supabase } = useActiveCompany();

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
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("aiSuggestions.title")}</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl bg-gray-50 py-8 px-4 text-center">
          <p className="text-xs text-gray-400">{t("aiSuggestions.empty")}</p>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("modules")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {modules.map((mod) => {
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
