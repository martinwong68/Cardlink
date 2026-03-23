"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";

type Holiday = {
  id: string;
  name: string;
  holiday_date: string;
  country_code: string;
  is_recurring: boolean;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };
const COUNTRIES = ["MY", "HK", "SG"] as const;

export default function PublicHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  const [name, setName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [countryCode, setCountryCode] = useState<string>("MY");
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHolidays = useCallback(async () => {
    try {
      const url = yearFilter
        ? `/api/business/hr/public-holidays?year=${yearFilter}`
        : "/api/business/hr/public-holidays";
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setHolidays(data.holidays ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [yearFilter]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const resetForm = () => { setName(""); setHolidayDate(""); setCountryCode("MY"); setIsRecurring(false); };

  const handleSubmit = async () => {
    if (!name.trim() || !holidayDate) return;
    setSaving(true);
    const payload = { name: name.trim(), holiday_date: holidayDate, country_code: countryCode, is_recurring: isRecurring };
    try {
      await fetch("/api/business/hr/public-holidays", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadHolidays();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Public Holidays</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Holiday</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {years.map((y) => (
          <button key={y} onClick={() => setYearFilter(y)} className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition ${yearFilter === y ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>{y}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Holiday</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Holiday Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Date</label><input value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} type="date" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Country</label>
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded border-gray-300" />
              Recurring every year
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !name.trim() || !holidayDate} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {holidays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No holidays found</p>
          <p className="text-xs text-gray-400">Add a public holiday for this year.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{h.name}</p>
                <p className="text-xs text-gray-500">{h.holiday_date} · {h.country_code}</p>
              </div>
              {h.is_recurring && (
                <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                  <RefreshCw className="h-3 w-3" />Recurring
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
