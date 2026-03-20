"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  CalendarDays,
  Clock,
  DollarSign,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

export default function BusinessHrPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [activeCount, setActiveCount] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [todayPresent, setTodayPresent] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [empRes, leaveRes, attendRes] = await Promise.all([
        supabase
          .from("hr_employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "active"),
        supabase
          .from("hr_leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "pending"),
        supabase
          .from("hr_attendance")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("date", today)
          .eq("status", "present"),
      ]);
      setActiveCount(empRes.count ?? 0);
      setPendingLeave(leaveRes.count ?? 0);
      setTodayPresent(attendRes.count ?? 0);
    } catch {
      // Tables may not exist yet
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadStats();
  }, [companyId, companyLoading, loadStats]);

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const stats = [
    { label: t("stats.activeEmployees"), value: activeCount, color: "bg-purple-50 text-purple-600", icon: Users },
    { label: t("stats.pendingLeave"), value: pendingLeave, color: "bg-amber-50 text-amber-600", icon: CalendarDays },
    { label: t("stats.todayAttendance"), value: todayPresent, color: "bg-green-50 text-green-600", icon: Clock },
  ];

  const quickLinks = [
    { key: "employees" as const, icon: Users, color: "bg-purple-50 text-purple-600", href: "/business/hr/employees" },
    { key: "leave" as const, icon: CalendarDays, color: "bg-amber-50 text-amber-600", href: "/business/hr/leave" },
    { key: "attendance" as const, icon: Clock, color: "bg-green-50 text-green-600", href: "/business/hr/attendance" },
    { key: "payroll" as const, icon: DollarSign, color: "bg-blue-50 text-blue-600", href: "/business/hr/payroll" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="app-card flex flex-col items-center gap-2 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-gray-800">{s.value}</span>
              <span className="text-[10px] text-gray-500 text-center">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.key}
              href={link.href}
              className="app-card group flex items-center gap-3 px-4 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{t(`quickLinks.${link.key}`)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
