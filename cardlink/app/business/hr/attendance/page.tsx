"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  ArrowLeft,
  Loader2,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type AttendanceRecord = {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  status: string;
  hr_employees: { full_name: string } | null;
};

type Employee = {
  id: string;
  full_name: string;
  status: string;
};

export default function AttendancePage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [attRes, empRes] = await Promise.all([
      supabase
        .from("hr_attendance")
        .select("*, hr_employees(full_name)")
        .eq("company_id", companyId)
        .eq("date", date),
      supabase
        .from("hr_employees")
        .select("id, full_name, status")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name"),
    ]);
    setRecords((attRes.data as AttendanceRecord[]) ?? []);
    setEmployees((empRes.data as Employee[]) ?? []);
    setLoading(false);
  }, [companyId, supabase, date]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const handleClockIn = async (employeeId: string) => {
    if (!companyId) return;
    const now = new Date().toISOString();
    await supabase.from("hr_attendance").upsert(
      { company_id: companyId, employee_id: employeeId, date, clock_in: now, status: "present" },
      { onConflict: "employee_id,date" }
    );
    void loadData();
  };

  const handleClockOut = async (employeeId: string) => {
    if (!companyId) return;
    const now = new Date().toISOString();
    const existing = records.find((r) => r.employee_id === employeeId);
    let hoursWorked: number | null = null;
    if (existing?.clock_in) {
      hoursWorked = Math.round(((new Date(now).getTime() - new Date(existing.clock_in).getTime()) / (1000 * 60 * 60)) * 100) / 100;
    }
    await supabase.from("hr_attendance")
      .update({ clock_out: now, hours_worked: hoursWorked })
      .eq("employee_id", employeeId)
      .eq("date", date)
      .eq("company_id", companyId);
    void loadData();
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const attendanceMap = new Map(records.map((r) => [r.employee_id, r]));
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = employees.length - presentCount;
  const lateCount = records.filter((r) => r.status === "late").length;

  const statusColors: Record<string, string> = {
    present: "bg-green-100 text-green-700",
    absent: "bg-gray-100 text-gray-600",
    late: "bg-amber-100 text-amber-700",
    half_day: "bg-blue-100 text-blue-700",
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("attendance.title")}</h1>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="app-input rounded-lg border px-3 py-2 text-sm text-center"
        />
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-green-600">{presentCount}</span>
          <span className="text-[10px] text-gray-500">{t("attendance.present")}</span>
        </div>
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-gray-500">{absentCount}</span>
          <span className="text-[10px] text-gray-500">{t("attendance.absent")}</span>
        </div>
        <div className="app-card flex flex-col items-center p-3">
          <span className="text-lg font-bold text-amber-600">{lateCount}</span>
          <span className="text-[10px] text-gray-500">{t("attendance.late")}</span>
        </div>
      </div>

      {/* Employee grid */}
      {employees.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <Clock className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t("attendance.noEmployees")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => {
            const record = attendanceMap.get(emp.id);
            const status = record?.status ?? "absent";
            return (
              <div key={emp.id} className="app-card flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                  {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{emp.full_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{t("attendance.clockIn")}: {formatTime(record?.clock_in ?? null)}</span>
                    <span>{t("attendance.clockOut")}: {formatTime(record?.clock_out ?? null)}</span>
                    {record?.hours_worked != null && (
                      <span>({record.hours_worked}h)</span>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[status]}`}>
                  {t(`attendance.statuses.${status}`)}
                </span>
                <div className="flex gap-1">
                  {!record?.clock_in && (
                    <button onClick={() => handleClockIn(emp.id)} className="app-primary-btn flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold">
                      <LogIn className="h-3 w-3" /> {t("attendance.clockInBtn")}
                    </button>
                  )}
                  {record?.clock_in && !record?.clock_out && (
                    <button onClick={() => handleClockOut(emp.id)} className="app-secondary-btn flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold">
                      <LogOut className="h-3 w-3" /> {t("attendance.clockOutBtn")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
