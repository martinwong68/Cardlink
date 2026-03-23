"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ClipboardList, CalendarDays, Calendar, Settings, Loader2, BarChart3, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveCompany } from "@/components/business/useActiveCompany";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const bookingFunctions: ModuleFunctionDefinition[] = [
  {
    id: "services",
    title: "Services",
    description: "Manage your bookable services and pricing",
    icon: ClipboardList,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "View Services",
    ctaHref: "/business/booking/services",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "View and manage your booking calendar",
    icon: CalendarDays,
    color: "bg-blue-50 text-blue-600",
    ctaLabel: "Open Calendar",
    ctaHref: "/business/booking/calendar",
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Browse all appointments and their status",
    icon: Calendar,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Appointments",
    ctaHref: "/business/booking/appointments",
  },
  {
    id: "availability",
    title: "Availability",
    description: "Configure available hours and blackout dates",
    icon: Settings,
    color: "bg-orange-50 text-orange-600",
    ctaLabel: "Set Availability",
    ctaHref: "/business/booking/availability",
  },
  {
    id: "customers",
    title: "Customers",
    description: "Manage your booking customer directory",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Customers",
    ctaHref: "/business/booking/customers",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Analytics, revenue tracking, and insights",
    icon: BarChart3,
    color: "bg-emerald-50 text-emerald-600",
    ctaLabel: "View Reports",
    ctaHref: "/business/booking/reports",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Configure booking behavior and public page",
    icon: Settings,
    color: "bg-gray-50 text-gray-600",
    ctaLabel: "Configure",
    ctaHref: "/business/booking/settings",
  },
];

type Appointment = {
  id: string; customer_name: string; start_time: string; end_time: string;
  status: string; booking_services: { name: string } | null;
};
type BookingData = { todayCount: number; upcomingCount: number; completedRate: number; todayAppointments: Appointment[] };

export default function BusinessBookingPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [activeId, setActiveId] = useState<string>(bookingFunctions[0].id);
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [todayRes, upcomingRes, completedRes, totalRes, todayAppts] = await Promise.all([
        supabase.from("booking_appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("appointment_date", today).neq("status", "cancelled"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId).gt("appointment_date", today).lte("appointment_date", weekLater).neq("status", "cancelled"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "completed"),
        supabase.from("booking_appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId).neq("status", "cancelled"),
        supabase.from("booking_appointments").select("id, customer_name, start_time, end_time, status, booking_services(name)").eq("company_id", companyId).eq("appointment_date", today).neq("status", "cancelled").order("start_time"),
      ]);

      const total = totalRes.count ?? 0;
      const completed = completedRes.count ?? 0;
      setData({
        todayCount: todayRes.count ?? 0,
        upcomingCount: upcomingRes.count ?? 0,
        completedRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        todayAppointments: (todayAppts.data as unknown as Appointment[]) ?? [],
      });
    } catch { /* tables may not exist */ }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadStats();
  }, [companyId, companyLoading, loadStats]);

  const activeFunc = useMemo(
    () => bookingFunctions.find((f) => f.id === activeId) ?? bookingFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return bookingFunctions;
    return bookingFunctions.map((fn) => {
      if (fn.id === "appointments" && data.todayCount > 0) {
        return { ...fn, badgeText: `${data.todayCount} today` };
      }
      if (fn.id === "calendar" && data.upcomingCount > 0) {
        return { ...fn, badgeText: `${data.upcomingCount} upcoming` };
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

  const statusColors: Record<string, string> = {
    pending: "text-amber-600",
    confirmed: "text-blue-600",
    completed: "text-green-600",
    no_show: "text-red-600",
  };

  return (
    <div className="space-y-4 pb-28">
      <ModuleFunctionSlider items={functionsWithBadges} activeId={activeId} onSelect={setActiveId} />
      <ModuleFunctionDetailCard
        title={activeFunc.title}
        description={activeFunc.description}
        ctaLabel={activeFunc.ctaLabel}
        ctaHref={activeFunc.ctaHref}
        loading={loading}
        empty={!loading && !hasContent(activeId, data)}
        emptyMessage={`No ${activeFunc.title.toLowerCase()} data yet`}
      >
        <DetailContent activeId={activeId} data={data} t={t} statusColors={statusColors} />
      </ModuleFunctionDetailCard>
    </div>
  );
}

function hasContent(id: string, data: BookingData | null): boolean {
  if (!data) return false;
  switch (id) {
    case "appointments": return data.todayAppointments.length > 0;
    case "calendar": return data.upcomingCount > 0;
    default: return false;
  }
}

function DetailContent({ activeId, data, t, statusColors }: { activeId: string; data: BookingData | null; t: ReturnType<typeof useTranslations>; statusColors: Record<string, string> }) {
  if (!data) return null;

  switch (activeId) {
    case "services":
      return <p className="text-sm text-gray-500">Manage your bookable services, durations, and pricing.</p>;
    case "calendar": {
      return (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-teal-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-teal-700">{data.todayCount}</p>
            <p className="text-[10px] text-teal-600">{t("stats.today")}</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-blue-700">{data.upcomingCount}</p>
            <p className="text-[10px] text-blue-600">{t("stats.upcoming")}</p>
          </div>
          <div className="rounded-xl bg-green-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-700">{data.completedRate}%</p>
            <p className="text-[10px] text-green-600">{t("stats.completionRate")}</p>
          </div>
        </div>
      );
    }
    case "appointments": {
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("todaySchedule")}</p>
          {data.todayAppointments.map((appt) => (
            <div key={appt.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2">
              <div className="text-xs font-mono text-gray-500 w-20">
                {appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{appt.customer_name}</p>
                <p className="text-[10px] text-gray-500 truncate">{appt.booking_services?.name}</p>
              </div>
              <span className={`text-[10px] font-medium ${statusColors[appt.status] ?? "text-gray-500"}`}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "availability":
      return <p className="text-sm text-gray-500">Configure business hours, lunch breaks, and blackout dates.</p>;
    default: return null;
  }
}
