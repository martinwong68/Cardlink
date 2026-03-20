"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  Loader2,
  ClipboardList,
  CalendarDays,
  Settings,
} from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

export default function BusinessBookingPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [todayCount, setTodayCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedRate, setCompletedRate] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<Array<{
    id: string; customer_name: string; start_time: string; end_time: string;
    status: string; booking_services: { name: string } | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [todayRes, upcomingRes, completedRes, totalRes, todayAppts] = await Promise.all([
        supabase.from("booking_appointments").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).eq("appointment_date", today).neq("status", "cancelled"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).gt("appointment_date", today).lte("appointment_date", weekLater).neq("status", "cancelled"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).eq("status", "completed"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).neq("status", "cancelled"),
        supabase.from("booking_appointments")
          .select("id, customer_name, start_time, end_time, status, booking_services(name)")
          .eq("company_id", companyId).eq("appointment_date", today).neq("status", "cancelled")
          .order("start_time"),
      ]);

      setTodayCount(todayRes.count ?? 0);
      setUpcomingCount(upcomingRes.count ?? 0);
      const total = totalRes.count ?? 0;
      const completed = completedRes.count ?? 0;
      setCompletedRate(total > 0 ? Math.round((completed / total) * 100) : 0);
      setTodayAppointments((todayAppts.data as unknown as typeof todayAppointments) ?? []);
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
    { label: t("stats.today"), value: todayCount, color: "bg-teal-50 text-teal-600", icon: Calendar },
    { label: t("stats.upcoming"), value: upcomingCount, color: "bg-blue-50 text-blue-600", icon: Clock },
    { label: t("stats.completionRate"), value: `${completedRate}%`, color: "bg-green-50 text-green-600", icon: TrendingUp },
  ];

  const quickLinks = [
    { key: "services" as const, icon: ClipboardList, color: "bg-teal-50 text-teal-600", href: "/business/booking/services" },
    { key: "calendar" as const, icon: CalendarDays, color: "bg-blue-50 text-blue-600", href: "/business/booking/calendar" },
    { key: "appointments" as const, icon: Calendar, color: "bg-indigo-50 text-indigo-600", href: "/business/booking/appointments" },
    { key: "availability" as const, icon: Settings, color: "bg-orange-50 text-orange-600", href: "/business/booking/availability" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-600",
    no_show: "bg-red-100 text-red-700",
  };

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

      {/* Today's Schedule */}
      {todayAppointments.length > 0 && (
        <div className="app-card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("todaySchedule")}</h2>
          <div className="space-y-2">
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-xs font-mono text-gray-500 w-20">
                  {appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{appt.customer_name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{appt.booking_services?.name}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[appt.status]}`}>
                  {t(`statuses.${appt.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
