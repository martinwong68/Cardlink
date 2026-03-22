"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Users, CalendarDays, Clock, DollarSign, Loader2,
  Building2, CalendarHeart, FileText, BarChart3,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveCompany } from "@/components/business/useActiveCompany";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const hrFunctions: ModuleFunctionDefinition[] = [
  {
    id: "employees",
    title: "Employees",
    description: "Browse and manage employee records",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Employees",
    ctaHref: "/business/hr/employees",
  },
  {
    id: "leave",
    title: "Leave",
    description: "Review and approve leave requests",
    icon: CalendarDays,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "View Leave",
    ctaHref: "/business/hr/leave",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Track daily check-in and presence",
    icon: Clock,
    color: "bg-green-50 text-green-600",
    ctaLabel: "View Attendance",
    ctaHref: "/business/hr/attendance",
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Process salary and compensation",
    icon: DollarSign,
    color: "bg-blue-50 text-blue-600",
    ctaLabel: "View Payroll",
    ctaHref: "/business/hr/payroll",
  },
  {
    id: "departments",
    title: "Departments",
    description: "Manage company departments and positions",
    icon: Building2,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Departments",
    ctaHref: "/business/hr/departments",
  },
  {
    id: "holidays",
    title: "Holidays",
    description: "Manage public holidays and company calendar",
    icon: CalendarHeart,
    color: "bg-rose-50 text-rose-600",
    ctaLabel: "View Holidays",
    ctaHref: "/business/hr/holidays",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Store and manage employee documents",
    icon: FileText,
    color: "bg-slate-50 text-slate-600",
    ctaLabel: "View Documents",
    ctaHref: "/business/hr/documents",
  },
  {
    id: "reports",
    title: "Reports",
    description: "HR analytics and workforce reports",
    icon: BarChart3,
    color: "bg-cyan-50 text-cyan-600",
    ctaLabel: "View Reports",
    ctaHref: "/business/hr/reports",
  },
];

type HrData = { activeCount: number; pendingLeave: number; todayPresent: number };

export default function BusinessHrPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [activeId, setActiveId] = useState<string>(hrFunctions[0].id);
  const [data, setData] = useState<HrData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [empRes, leaveRes, attendRes] = await Promise.all([
        supabase.from("hr_employees").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
        supabase.from("hr_leave_requests").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending"),
        supabase.from("hr_attendance").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("date", today).eq("status", "present"),
      ]);
      setData({ activeCount: empRes.count ?? 0, pendingLeave: leaveRes.count ?? 0, todayPresent: attendRes.count ?? 0 });
    } catch { /* tables may not exist */ }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadStats();
  }, [companyId, companyLoading, loadStats]);

  const activeFunc = useMemo(
    () => hrFunctions.find((f) => f.id === activeId) ?? hrFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return hrFunctions;
    return hrFunctions.map((fn) => {
      if (fn.id === "leave" && data.pendingLeave > 0) {
        return { ...fn, badgeText: `${data.pendingLeave} pending` };
      }
      return fn;
    });
  }, [data]);

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <ModuleFunctionSlider items={functionsWithBadges} activeId={activeId} onSelect={setActiveId} />
      <ModuleFunctionDetailCard
        title={activeFunc.title}
        description={activeFunc.description}
        ctaLabel={activeFunc.ctaLabel}
        ctaHref={activeFunc.ctaHref}
        loading={loading}
        empty={false}
        emptyMessage=""
      >
        <DetailContent activeId={activeId} data={data} t={t} />
      </ModuleFunctionDetailCard>
    </div>
  );
}

function DetailContent({ activeId, data, t }: { activeId: string; data: HrData | null; t: ReturnType<typeof useTranslations> }) {
  if (!data) return null;

  switch (activeId) {
    case "employees":
      return (
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-gray-900">{data.activeCount}</p>
          <p className="text-[10px] text-gray-500">{t("stats.activeEmployees")}</p>
        </div>
      );
    case "leave":
      return (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-amber-700">{data.pendingLeave}</p>
          <p className="text-[10px] text-amber-600">{t("stats.pendingLeave")}</p>
        </div>
      );
    case "attendance":
      return (
        <div className="rounded-xl bg-green-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-green-700">{data.todayPresent}</p>
          <p className="text-[10px] text-green-600">{t("stats.todayAttendance")}</p>
        </div>
      );
    case "payroll":
      return (
        <p className="text-sm text-gray-500">{t("stats.payrollDesc")}</p>
      );
    case "departments":
      return (
        <p className="text-sm text-gray-500">{t("stats.departmentsDesc")}</p>
      );
    case "holidays":
      return (
        <p className="text-sm text-gray-500">{t("stats.holidaysDesc")}</p>
      );
    case "documents":
      return (
        <p className="text-sm text-gray-500">{t("stats.documentsDesc")}</p>
      );
    case "reports":
      return (
        <p className="text-sm text-gray-500">{t("stats.reportsDesc")}</p>
      );
    default: return null;
  }
}
