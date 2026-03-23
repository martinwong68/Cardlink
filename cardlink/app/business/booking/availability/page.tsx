"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  CalendarOff,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type AvailabilitySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

type DateOverride = {
  id: string;
  override_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export default function AvailabilityPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideReason, setOverrideReason] = useState("");

  const dayNames = [
    t("availability.days.mon"),
    t("availability.days.tue"),
    t("availability.days.wed"),
    t("availability.days.thu"),
    t("availability.days.fri"),
    t("availability.days.sat"),
    t("availability.days.sun"),
  ];

  const defaultSlots: AvailabilitySlot[] = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: "09:00",
    end_time: "17:00",
    is_available: i < 5, // Mon–Fri on by default
  }));

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [availRes, overrideRes] = await Promise.all([
      supabase
        .from("booking_availability")
        .select("*")
        .eq("company_id", companyId)
        .is("service_id", null)
        .order("day_of_week"),
      supabase
        .from("booking_date_overrides")
        .select("*")
        .eq("company_id", companyId)
        .order("override_date"),
    ]);

    const data = availRes.data;
    if (data && data.length > 0) {
      const loaded = defaultSlots.map((ds) => {
        const found = (data as Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }>)
          .find((d) => d.day_of_week === ds.day_of_week);
        return found
          ? { day_of_week: found.day_of_week, start_time: found.start_time, end_time: found.end_time, is_available: found.is_available }
          : ds;
      });
      setSlots(loaded);
    } else {
      setSlots(defaultSlots);
    }

    setOverrides((overrideRes.data as DateOverride[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string | boolean) => {
    setSlots((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    // Delete existing company-wide availability
    await supabase
      .from("booking_availability")
      .delete()
      .eq("company_id", companyId)
      .is("service_id", null);

    // Insert new
    const rows = slots
      .filter((s) => s.is_available)
      .map((s) => ({
        company_id: companyId,
        service_id: null,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: true,
      }));

    if (rows.length > 0) {
      await supabase.from("booking_availability").insert(rows);
    }
    setSaving(false);
    setSaved(true);
  };

  const handleAddOverride = async () => {
    if (!companyId || !overrideDate) return;
    setSaving(true);
    await supabase.from("booking_date_overrides").insert({
      company_id: companyId,
      override_date: overrideDate,
      is_closed: overrideClosed,
      start_time: overrideClosed ? null : overrideStart,
      end_time: overrideClosed ? null : overrideEnd,
      reason: overrideReason || null,
    });
    setSaving(false);
    setShowOverrideForm(false);
    setOverrideDate(""); setOverrideClosed(true); setOverrideReason("");
    void loadData();
  };

  const handleDeleteOverride = async (id: string) => {
    await supabase.from("booking_date_overrides").delete().eq("id", id).eq("company_id", companyId);
    void loadData();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
          <h1 className="app-title mt-1 text-xl font-semibold">{t("availability.title")}</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500">{t("availability.subtitle")}</p>

      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div key={i} className="app-card flex items-center gap-3 p-4">
            <div className="w-12">
              <span className="text-xs font-semibold text-gray-700">{dayNames[slot.day_of_week]}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={slot.is_available}
                onChange={(e) => updateSlot(i, "is_available", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-600">{slot.is_available ? t("availability.open") : t("availability.closed")}</span>
            </label>
            {slot.is_available && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(i, "start_time", e.target.value)}
                  className="app-input rounded border px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => updateSlot(i, "end_time", e.target.value)}
                  className="app-input rounded border px-2 py-1 text-xs"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="app-primary-btn w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? t("availability.saving") : saved ? t("availability.saved") : t("availability.save")}
      </button>

      {/* Date-Specific Overrides Section */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <CalendarOff className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">{t("availability.dateOverrides")}</h2>
          <button
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className="ml-auto app-primary-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            <Plus className="h-3 w-3" /> {t("availability.addOverride")}
          </button>
        </div>

        {showOverrideForm && (
          <div className="app-card p-4 space-y-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("availability.overrideDate")}</label>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={overrideClosed} onChange={(e) => setOverrideClosed(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
              <span className="text-xs text-gray-700">{t("availability.closedAllDay")}</span>
            </label>
            {!overrideClosed && (
              <div className="flex items-center gap-2">
                <input type="time" value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} className="app-input rounded border px-2 py-1 text-xs flex-1" />
                <span className="text-xs text-gray-400">–</span>
                <input type="time" value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} className="app-input rounded border px-2 py-1 text-xs flex-1" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("availability.reason")}</label>
              <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("availability.reasonPlaceholder")} />
            </div>
            <button onClick={handleAddOverride} disabled={saving || !overrideDate} className="app-primary-btn w-full rounded-lg py-2 text-sm font-semibold disabled:opacity-40">
              {t("availability.saveOverride")}
            </button>
          </div>
        )}

        {overrides.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t("availability.noOverrides")}</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((ov) => (
              <div key={ov.id} className="app-card flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{ov.override_date}</p>
                  <p className="text-[10px] text-gray-500">
                    {ov.is_closed ? t("availability.closed") : `${ov.start_time?.slice(0, 5)} – ${ov.end_time?.slice(0, 5)}`}
                    {ov.reason && ` — ${ov.reason}`}
                  </p>
                </div>
                <button onClick={() => handleDeleteOverride(ov.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
