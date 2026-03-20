"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  ArrowLeft,
  Loader2,
  Play,
  Check,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type PayrollRecord = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  overtime: number;
  deductions: number;
  allowances: number;
  net_pay: number;
  status: string;
  paid_at: string | null;
  hr_employees: { full_name: string } | null;
};

export default function PayrollPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Period selector
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("hr_payroll")
      .select("*, hr_employees(full_name)")
      .eq("company_id", companyId)
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd)
      .order("created_at", { ascending: false });
    setRecords((data as PayrollRecord[]) ?? []);
    setLoading(false);
  }, [companyId, supabase, periodStart, periodEnd]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const handleGenerate = async () => {
    if (!companyId) return;
    setGenerating(true);

    // Get active employees
    const { data: employees } = await supabase
      .from("hr_employees")
      .select("id, salary, salary_period")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (employees && employees.length > 0) {
      const rows = employees.map((emp) => ({
        company_id: companyId,
        employee_id: emp.id as string,
        period_start: periodStart,
        period_end: periodEnd,
        basic_salary: emp.salary as number,
        overtime: 0,
        deductions: 0,
        allowances: 0,
        net_pay: emp.salary as number,
        status: "draft",
      }));
      await supabase.from("hr_payroll").insert(rows);
    }
    setGenerating(false);
    void loadData();
  };

  const handleBulkUpdate = async (newStatus: "approved" | "paid") => {
    if (!companyId) return;
    setBulkUpdating(true);
    const targetStatus = newStatus === "approved" ? "draft" : "approved";
    const ids = records.filter((r) => r.status === targetStatus).map((r) => r.id);
    if (ids.length > 0) {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "paid") updateData.paid_at = new Date().toISOString();
      await supabase
        .from("hr_payroll")
        .update(updateData)
        .in("id", ids)
        .eq("company_id", companyId);
    }
    setBulkUpdating(false);
    void loadData();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const draftCount = records.filter((r) => r.status === "draft").length;
  const approvedCount = records.filter((r) => r.status === "approved").length;
  const paidCount = records.filter((r) => r.status === "paid").length;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("payroll.title")}</h1>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="app-input rounded-lg border px-3 py-2 text-sm">
          {months.map((m) => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString(undefined, { month: "long" })}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="app-input rounded-lg border px-3 py-2 text-sm">
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={generating || records.length > 0}
          className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {t("payroll.generate")}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-gray-500">{draftCount}</span>
          <span className="text-[10px] text-gray-500">{t("payroll.statuses.draft")}</span>
        </div>
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-blue-600">{approvedCount}</span>
          <span className="text-[10px] text-gray-500">{t("payroll.statuses.approved")}</span>
        </div>
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-green-600">{paidCount}</span>
          <span className="text-[10px] text-gray-500">{t("payroll.statuses.paid")}</span>
        </div>
      </div>

      {/* Bulk actions */}
      {records.length > 0 && (
        <div className="flex gap-2">
          {draftCount > 0 && (
            <button
              onClick={() => handleBulkUpdate("approved")}
              disabled={bulkUpdating}
              className="app-primary-btn flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              <Check className="h-3 w-3" /> {t("payroll.bulkApprove")} ({draftCount})
            </button>
          )}
          {approvedCount > 0 && (
            <button
              onClick={() => handleBulkUpdate("paid")}
              disabled={bulkUpdating}
              className="app-secondary-btn flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              <CheckCheck className="h-3 w-3" /> {t("payroll.bulkPaid")} ({approvedCount})
            </button>
          )}
        </div>
      )}

      {/* Payroll records */}
      {records.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <DollarSign className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t("payroll.empty")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("payroll.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div key={rec.id} className="app-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  {rec.hr_employees?.full_name ?? t("payroll.unknownEmployee")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[rec.status]}`}>
                  {t(`payroll.statuses.${rec.status}`)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-[10px]">
                <div className="text-center">
                  <p className="text-gray-400">{t("payroll.basic")}</p>
                  <p className="font-semibold text-gray-700">{fmt(rec.basic_salary)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">{t("payroll.overtime")}</p>
                  <p className="font-semibold text-gray-700">{fmt(rec.overtime)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">{t("payroll.deductions")}</p>
                  <p className="font-semibold text-red-600">-{fmt(rec.deductions)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">{t("payroll.allowances")}</p>
                  <p className="font-semibold text-green-600">+{fmt(rec.allowances)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">{t("payroll.netPay")}</p>
                  <p className="font-bold text-gray-900">{fmt(rec.net_pay)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
