"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  X,
  Ban,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Appointment = {
  id: string;
  service_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  total_price: number;
  booking_services: { name: string; duration_minutes: number } | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

export default function AppointmentsPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "today" | "upcoming" | "past">("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [serviceId, setServiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [apptRes, svcRes] = await Promise.all([
      supabase
        .from("booking_appointments")
        .select("*, booking_services(name, duration_minutes)")
        .eq("company_id", companyId)
        .order("appointment_date", { ascending: false })
        .order("start_time"),
      supabase
        .from("booking_services")
        .select("id, name, duration_minutes, price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
    ]);
    setAppointments((apptRes.data as Appointment[]) ?? []);
    setServices((svcRes.data as Service[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("booking_appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id).eq("company_id", companyId);
    void loadData();
  };

  const handleSubmit = async () => {
    if (!companyId || !serviceId || !customerName || !apptDate || !startTime) return;
    setSaving(true);

    const svc = services.find((s) => s.id === serviceId);
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = h * 60 + m + (svc?.duration_minutes ?? 60);
    const endTime = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;

    await supabase.from("booking_appointments").insert({
      company_id: companyId,
      service_id: serviceId,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      appointment_date: apptDate,
      start_time: startTime,
      end_time: endTime,
      notes: notes || null,
      total_price: svc?.price ?? 0,
    });

    setSaving(false);
    setShowForm(false);
    setServiceId(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone("");
    setApptDate(""); setStartTime(""); setNotes("");
    void loadData();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const filtered = appointments.filter((a) => {
    if (tab === "today") return a.appointment_date === today;
    if (tab === "upcoming") return a.appointment_date > today;
    if (tab === "past") return a.appointment_date < today;
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-600",
    no_show: "bg-red-100 text-red-700",
  };

  const tabs = ["all", "today", "upcoming", "past"] as const;

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">{t("brand")}</p>
            <h1 className="app-title mt-1 text-xl font-semibold">{t("appointments.addTitle")}</h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.service")}</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">{t("appointments.fields.selectService")}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} {t("services.mins")})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.customerName")}</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.email")}</label>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.phone")}</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.date")}</label>
              <input value={apptDate} onChange={(e) => setApptDate(e.target.value)} type="date" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.time")}</label>
              <input value={startTime} onChange={(e) => setStartTime(e.target.value)} type="time" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("appointments.fields.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !serviceId || !customerName || !apptDate || !startTime}
          className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? t("appointments.saving") : t("appointments.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/booking" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("appointments.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("appointments.add")}
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
            {t(`appointments.tabs.${tb}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <Calendar className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t("appointments.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => (
            <div key={appt.id} className="app-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{appt.customer_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[appt.status]}`}>
                  {t(`statuses.${appt.status}`)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{appt.booking_services?.name}</span>
                <span>·</span>
                <span>{appt.appointment_date}</span>
                <span>{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</span>
              </div>
              {appt.notes && <p className="text-xs text-gray-500">{appt.notes}</p>}
              <div className="flex gap-2 pt-1">
                {appt.status === "pending" && (
                  <button onClick={() => updateStatus(appt.id, "confirmed")} className="app-primary-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <Check className="h-3 w-3" /> {t("appointments.confirm")}
                  </button>
                )}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <>
                    <button onClick={() => updateStatus(appt.id, "cancelled")} className="app-secondary-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold">
                      <X className="h-3 w-3" /> {t("appointments.cancel")}
                    </button>
                    <button onClick={() => updateStatus(appt.id, "completed")} className="flex items-center gap-1 rounded-lg bg-green-50 text-green-700 px-3 py-1.5 text-xs font-semibold hover:bg-green-100">
                      <Check className="h-3 w-3" /> {t("appointments.complete")}
                    </button>
                    <button onClick={() => updateStatus(appt.id, "no_show")} className="flex items-center gap-1 rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-100">
                      <AlertTriangle className="h-3 w-3" /> {t("appointments.noShow")}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
