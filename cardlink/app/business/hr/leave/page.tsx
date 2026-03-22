"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  hr_employees: { full_name: string } | null;
};

type Employee = {
  id: string;
  full_name: string;
};

type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type: string;
  year: number;
  entitlement: number;
  used: number;
  carried_over: number;
};

export default function LeavePage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "balances">("pending");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializingBalances, setInitializingBalances] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const calcDays = (s: string, e: string) => {
    if (!s || !e) return 0;
    const diff = new Date(e).getTime() - new Date(s).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [reqRes, empRes, balRes] = await Promise.all([
      supabase
        .from("hr_leave_requests")
        .select("*, hr_employees(full_name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("hr_employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("hr_leave_balances")
        .select("*")
        .eq("company_id", companyId)
        .eq("year", new Date().getFullYear()),
    ]);
    setRequests((reqRes.data as LeaveRequest[]) ?? []);
    setEmployees((empRes.data as Employee[]) ?? []);
    setBalances((balRes.data as LeaveBalance[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const handleApprove = async (id: string) => {
    await supabase.from("hr_leave_requests")
      .update({ status: "approved" })
      .eq("id", id).eq("company_id", companyId);
    void loadData();
  };

  const handleReject = async (id: string) => {
    await supabase.from("hr_leave_requests")
      .update({ status: "rejected" })
      .eq("id", id).eq("company_id", companyId);
    void loadData();
  };

  const handleSubmit = async () => {
    if (!companyId || !employeeId || !startDate || !endDate) return;
    setSaving(true);
    await supabase.from("hr_leave_requests").insert({
      company_id: companyId,
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days: calcDays(startDate, endDate),
      reason: reason || null,
    });
    setSaving(false);
    setShowForm(false);
    setEmployeeId(""); setStartDate(""); setEndDate(""); setReason(""); setLeaveType("annual");
    void loadData();
  };

  const handleInitializeBalances = async () => {
    if (!companyId) return;
    setInitializingBalances(true);
    await fetch("/api/business/hr/leave-balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "initialize", year: new Date().getFullYear() }),
    });
    setInitializingBalances(false);
    void loadData();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const filtered = requests.filter((r) => r.status === tab);

  const leaveTypeColors: Record<string, string> = {
    annual: "bg-blue-100 text-blue-700",
    sick: "bg-red-100 text-red-700",
    unpaid: "bg-gray-100 text-gray-700",
    maternity: "bg-pink-100 text-pink-700",
    paternity: "bg-teal-100 text-teal-700",
    other: "bg-purple-100 text-purple-700",
  };

  const tabs = ["pending", "approved", "rejected", "balances"] as const;

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">{t("brand")}</p>
            <h1 className="app-title mt-1 text-xl font-semibold">{t("leave.addTitle")}</h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("leave.fields.employee")}</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">{t("leave.fields.selectEmployee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("leave.fields.leaveType")}</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              {["annual", "sick", "unpaid", "maternity", "paternity", "other"].map((lt) => (
                <option key={lt} value={lt}>{t(`leave.types.${lt}`)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("leave.fields.startDate")}</label>
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("leave.fields.endDate")}</label>
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-gray-500">{t("leave.fields.daysCount", { count: calcDays(startDate, endDate) })}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("leave.fields.reason")}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !employeeId || !startDate || !endDate}
          className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? t("leave.saving") : t("leave.submit")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("leave.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("leave.add")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${tab === tb ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t(`leave.tabs.${tb}`)} {tb !== "balances" ? `(${requests.filter((r) => r.status === tb).length})` : ""}
          </button>
        ))}
      </div>

      {/* Balances Tab */}
      {tab === "balances" ? (
        <div className="space-y-4">
          {balances.length === 0 ? (
            <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
              <CalendarDays className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">{t("leave.balancesEmpty")}</p>
              <button
                onClick={handleInitializeBalances}
                disabled={initializingBalances}
                className="app-primary-btn mt-4 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                {initializingBalances ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {t("leave.initBalances")}
              </button>
            </div>
          ) : (
            <>
              {/* Group balances by employee */}
              {employees.map((emp) => {
                const empBalances = balances.filter((b) => b.employee_id === emp.id);
                if (empBalances.length === 0) return null;
                return (
                  <div key={emp.id} className="app-card p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-800">{emp.full_name}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      {empBalances.map((bal) => {
                        const remaining = bal.entitlement + bal.carried_over - bal.used;
                        return (
                          <div key={bal.id} className="rounded-lg bg-gray-50 p-2 text-center">
                            <p className="font-semibold text-gray-700">{t(`leave.types.${bal.leave_type}`)}</p>
                            <p className="text-gray-500">{bal.used}/{bal.entitlement + bal.carried_over}</p>
                            <p className={`font-bold ${remaining > 0 ? "text-green-600" : "text-red-600"}`}>{remaining} {t("leave.balanceLeft")}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : (
      <>

      {filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <CalendarDays className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t("leave.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="app-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {req.hr_employees?.full_name ?? t("leave.unknownEmployee")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${leaveTypeColors[req.leave_type] ?? "bg-gray-100 text-gray-600"}`}>
                  {t(`leave.types.${req.leave_type}`)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{req.start_date} → {req.end_date}</span>
                <span>·</span>
                <span>{req.days} {t("leave.days")}</span>
              </div>
              {req.reason && <p className="text-xs text-gray-500">{req.reason}</p>}
              {tab === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleApprove(req.id)} className="app-primary-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <Check className="h-3 w-3" /> {t("leave.approve")}
                  </button>
                  <button onClick={() => handleReject(req.id)} className="app-secondary-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <X className="h-3 w-3" /> {t("leave.reject")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
