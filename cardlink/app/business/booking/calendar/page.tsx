"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Appointment = {
  id: string;
  customer_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_services: { name: string; duration_minutes: number } | null;
};

export default function BookingCalendarPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    let dateFrom: string;
    let dateTo: string;

    if (viewMode === "day") {
      dateFrom = currentDate.toISOString().slice(0, 10);
      dateTo = dateFrom;
    } else {
      // Week view: get Monday of current week
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      dateFrom = monday.toISOString().slice(0, 10);
      dateTo = sunday.toISOString().slice(0, 10);
    }

    const { data } = await supabase
      .from("booking_appointments")
      .select("id, customer_name, appointment_date, start_time, end_time, status, booking_services(name, duration_minutes)")
      .eq("company_id", companyId)
      .gte("appointment_date", dateFrom)
      .lte("appointment_date", dateTo)
      .neq("status", "cancelled")
      .order("appointment_date")
      .order("start_time");

    setAppointments((data as unknown as Appointment[]) ?? []);
    setLoading(false);
  }, [companyId, supabase, viewMode, currentDate]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const shiftDate = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === "week" ? delta * 7 : delta));
    setCurrentDate(d);
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-200 border-amber-300 text-amber-800",
    confirmed: "bg-blue-200 border-blue-300 text-blue-800",
    completed: "bg-green-200 border-green-300 text-green-800",
    no_show: "bg-red-200 border-red-300 text-red-800",
  };

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

  // Day view rendering
  const renderDayView = () => {
    const dayStr = currentDate.toISOString().slice(0, 10);
    const dayAppts = appointments.filter((a) => a.appointment_date === dayStr);

    return (
      <div className="app-card p-4">
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="flex items-start border-t border-gray-100" style={{ minHeight: 60 }}>
              <span className="w-12 shrink-0 text-[10px] text-gray-400 pt-1">
                {String(h).padStart(2, "0")}:00
              </span>
              <div className="flex-1 relative min-h-[60px]">
                {dayAppts
                  .filter((a) => {
                    const apptH = parseInt(a.start_time?.slice(0, 2) ?? "0", 10);
                    return apptH === h;
                  })
                  .map((a) => {
                    const mins = parseInt(a.start_time?.slice(3, 5) ?? "0", 10);
                    const duration = a.booking_services?.duration_minutes ?? 60;
                    const heightPx = Math.max(30, (duration / 60) * 60);
                    const topPx = (mins / 60) * 60;
                    return (
                      <Link
                        key={a.id}
                        href={`/business/booking/appointments`}
                        className={`absolute left-0 right-0 rounded-lg border px-2 py-1 text-[10px] ${statusColors[a.status] ?? "bg-gray-100 text-gray-600"}`}
                        style={{ top: topPx, height: heightPx }}
                      >
                        <p className="font-semibold truncate">{a.customer_name}</p>
                        <p className="truncate">{a.booking_services?.name} · {a.start_time?.slice(0, 5)}</p>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Week view rendering
  const renderWeekView = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(d).setDate(diff));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      return wd;
    });

    const dayNames = [t("calendar.mon"), t("calendar.tue"), t("calendar.wed"), t("calendar.thu"), t("calendar.fri"), t("calendar.sat"), t("calendar.sun")];

    return (
      <div className="app-card p-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((wd, i) => {
            const dayStr = wd.toISOString().slice(0, 10);
            const dayAppts = appointments.filter((a) => a.appointment_date === dayStr);
            const isToday = dayStr === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} className="text-center">
                <p className={`text-[10px] font-semibold mb-1 ${isToday ? "text-indigo-600" : "text-gray-500"}`}>
                  {dayNames[i]}
                </p>
                <p className={`text-xs font-bold mb-2 ${isToday ? "text-indigo-600" : "text-gray-700"}`}>
                  {wd.getDate()}
                </p>
                <div className="space-y-1">
                  {dayAppts.length > 0 ? (
                    dayAppts.slice(0, 3).map((a) => (
                      <div key={a.id} className={`rounded px-1 py-0.5 text-[8px] ${statusColors[a.status] ?? "bg-gray-100"}`}>
                        {a.start_time?.slice(0, 5)}
                      </div>
                    ))
                  ) : (
                    <p className="text-[8px] text-gray-300">—</p>
                  )}
                  {dayAppts.length > 3 && (
                    <p className="text-[8px] text-gray-400">+{dayAppts.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/booking" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("calendar.title")}</h1>
        </div>
      </div>

      {/* View toggle & date nav */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setViewMode("day")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${viewMode === "day" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
          >
            {t("calendar.day")}
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${viewMode === "week" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
          >
            {t("calendar.week")}
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {viewMode === "day" ? renderDayView() : renderWeekView()}

      {appointments.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t("calendar.empty")}</p>
        </div>
      )}
    </div>
  );
}
