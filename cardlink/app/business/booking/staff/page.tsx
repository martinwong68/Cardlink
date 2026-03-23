"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Loader2, Mail, Phone } from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specializations: string[];
  is_active: boolean;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function BookingStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const url = activeFilter !== "all"
        ? `/api/business/booking/staff?is_active=${activeFilter === "active"}`
        : "/api/business/booking/staff";
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setStaff(data.staff ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeFilter]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const resetForm = () => { setName(""); setEmail(""); setPhone(""); setSpecializations(""); setIsActive(true); };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      specializations: specializations.split(",").map((s) => s.trim()).filter(Boolean),
      is_active: isActive,
    };
    try {
      await fetch("/api/business/booking/staff", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadStaff();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const FILTERS = ["all", "active", "inactive"] as const;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Booking Staff</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Staff</button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${activeFilter === f ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>{f}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Staff Member</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Specializations (comma-separated)</label><input value={specializations} onChange={(e) => setSpecializations(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="e.g. Haircut, Color, Styling" /></div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300" />
              Active
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !name.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No staff members</p>
          <p className="text-xs text-gray-400">Add your first staff member.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${!s.is_active ? "opacity-60" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{s.is_active ? "Active" : "Inactive"}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                  {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                  {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                </div>
                {s.specializations?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.specializations.map((sp) => (
                      <span key={sp} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{sp}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
