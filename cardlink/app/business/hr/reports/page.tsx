"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type HeadcountData = {
  total: number;
  active: number;
  inactive: number;
  terminated: number;
  byDepartment: Record<string, number>;
  byType: Record<string, number>;
};

type AttendanceData = {
  month: string;
  totalRecords: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
};

type LeaveData = {
  year: string;
  byType: Record<string, { entitlement: number; used: number; remaining: number }>;
};

type PayrollData = {
  totalBasic: number;
  totalOvertime: number;
  totalDeductions: number;
  totalAllowances: number;
  totalNetPay: number;
  recordCount: number;
};

export default function ReportsPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading } = useActiveCompany();

  const [tab, setTab] = useState<"headcount" | "attendance" | "leave" | "payroll">("headcount");
  const [loading, setLoading] = useState(true);
  const [headcount, setHeadcount] = useState<HeadcountData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [leave, setLeave] = useState<LeaveData | null>(null);
  const [payroll, setPayroll] = useState<PayrollData | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/hr/reports?type=${tab}`);
      const json = await res.json();
      if (tab === "headcount") setHeadcount(json.data as HeadcountData);
      if (tab === "attendance") setAttendance(json.data as AttendanceData);
      if (tab === "leave") setLeave(json.data as LeaveData);
      if (tab === "payroll") setPayroll(json.data as PayrollData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
    setLoading(false);
  }, [companyId, tab]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadReport();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadReport]);

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const tabs = ["headcount", "attendance", "leave", "payroll"] as const;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const empTypeLabels: Record<string, string> = {
    full_time: t("employmentTypes.fullTime"),
    part_time: t("employmentTypes.partTime"),
    contract: t("employmentTypes.contract"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("reports.title")}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${tab === tb ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t(`reports.tabs.${tb}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <>
          {/* Headcount Report */}
          {tab === "headcount" && headcount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="app-card flex flex-col items-center p-4">
                  <Users className="h-5 w-5 text-purple-500 mb-1" />
                  <span className="text-2xl font-bold text-gray-900">{headcount.total}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.headcount.total")}</span>
                </div>
                <div className="app-card flex flex-col items-center p-4">
                  <span className="text-2xl font-bold text-green-600">{headcount.active}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.headcount.active")}</span>
                </div>
              </div>
              {Object.keys(headcount.byDepartment).length > 0 && (
                <div className="app-card p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-600">{t("reports.headcount.byDepartment")}</h3>
                  {Object.entries(headcount.byDepartment).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{dept}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(headcount.byType).length > 0 && (
                <div className="app-card p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-600">{t("reports.headcount.byType")}</h3>
                  {Object.entries(headcount.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{empTypeLabels[type] ?? type}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance Report */}
          {tab === "attendance" && attendance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="app-card flex flex-col items-center p-4">
                  <Clock className="h-5 w-5 text-green-500 mb-1" />
                  <span className="text-2xl font-bold text-green-600">{attendance.presentDays}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.attendance.presentDays")}</span>
                </div>
                <div className="app-card flex flex-col items-center p-4">
                  <span className="text-2xl font-bold text-gray-500">{attendance.absentDays}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.attendance.absentDays")}</span>
                </div>
                <div className="app-card flex flex-col items-center p-4">
                  <span className="text-2xl font-bold text-amber-600">{attendance.lateDays}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.attendance.lateDays")}</span>
                </div>
                <div className="app-card flex flex-col items-center p-4">
                  <span className="text-2xl font-bold text-blue-600">{attendance.totalHours}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.attendance.totalHours")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Leave Report */}
          {tab === "leave" && leave && (
            <div className="space-y-4">
              {Object.keys(leave.byType).length === 0 ? (
                <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
                  <CalendarDays className="h-8 w-8 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">{t("reports.leave.empty")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(leave.byType).map(([type, data]) => (
                    <div key={type} className="app-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{t(`leave.types.${type}`)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="text-center">
                          <p className="text-gray-400">{t("reports.leave.entitlement")}</p>
                          <p className="font-semibold text-gray-700">{data.entitlement}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">{t("reports.leave.used")}</p>
                          <p className="font-semibold text-red-600">{data.used}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">{t("reports.leave.remaining")}</p>
                          <p className="font-semibold text-green-600">{data.remaining}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payroll Report */}
          {tab === "payroll" && payroll && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="app-card flex flex-col items-center p-4">
                  <DollarSign className="h-5 w-5 text-blue-500 mb-1" />
                  <span className="text-xl font-bold text-gray-900">{fmt(payroll.totalNetPay)}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.payroll.totalNetPay")}</span>
                </div>
                <div className="app-card flex flex-col items-center p-4">
                  <span className="text-xl font-bold text-gray-600">{payroll.recordCount}</span>
                  <span className="text-[10px] text-gray-500">{t("reports.payroll.records")}</span>
                </div>
              </div>
              <div className="app-card p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("payroll.basic")}</span>
                  <span className="font-semibold text-gray-700">{fmt(payroll.totalBasic)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("payroll.overtime")}</span>
                  <span className="font-semibold text-gray-700">{fmt(payroll.totalOvertime)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("payroll.deductions")}</span>
                  <span className="font-semibold text-red-600">-{fmt(payroll.totalDeductions)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("payroll.allowances")}</span>
                  <span className="font-semibold text-green-600">+{fmt(payroll.totalAllowances)}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">{t("payroll.netPay")}</span>
                  <span className="font-bold text-gray-900">{fmt(payroll.totalNetPay)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
