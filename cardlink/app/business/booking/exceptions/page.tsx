"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarOff, Loader2, CheckCircle, XCircle } from "lucide-react";

type StaffOption = { id: string; name: string };

type Exception = {
  id: string;
  staff_id: string;
  staff_name?: string;
  exception_date: string;
  is_available: boolean;
  reason: string | null;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function BookingExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [staffId, setStaffId] = useState("");
  const [exceptionDate, setExceptionDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [excRes, staffRes] = await Promise.all([
        fetch(`/api/business/booking/exceptions?month=${monthFilter}`, { headers: HEADERS, cache: "no-store" }),
        fetch("/api/business/booking/staff", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (excRes.ok) { const data = await excRes.json(); setExceptions(data.exceptions ?? []); }
      if (staffRes.ok) { const data = await staffRes.json(); setStaffList((data.staff ?? []).map((s: StaffOption) => ({ id: s.id, name: s.name }))); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [monthFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => { setStaffId(""); setExceptionDate(""); setIsAvailable(false); setReason(""); };

  const handleSubmit = async () => {
    if (!staffId || !exceptionDate) return;
    setSaving(true);
    const payload = { staff_id: staffId, exception_date: exceptionDate, is_available: isAvailable, reason: reason.trim() || null };
    try {
      await fetch("/api/business/booking/exceptions", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadData();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const staffNameMap = Object.fromEntries(staffList.map((s) => [s.id, s.name]));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Schedule Exceptions</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Exception</button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Month</label>
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Exception</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Staff Member</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <option value="">Select staff…</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Date</label><input value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} type="date" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="rounded border-gray-300" />
              Available (override as working day)
            </label>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="e.g. Personal leave, Training day" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !staffId || !exceptionDate} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {exceptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <CalendarOff className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No exceptions this month</p>
          <p className="text-xs text-gray-400">Add a schedule exception for a staff member.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exceptions.map((ex) => (
            <div key={ex.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              {ex.is_available ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{staffNameMap[ex.staff_id] ?? ex.staff_id}</p>
                <p className="text-xs text-gray-500">{ex.exception_date}{ex.reason ? ` · ${ex.reason}` : ""}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ex.is_available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {ex.is_available ? "Available" : "Unavailable"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
