"use client";

import { useEffect, useState, useCallback } from "react";

type Shift = { id: string; register_id: string; status: string; opening_cash: number; closing_cash: number | null; total_sales: number | null; opened_at: string; closed_at: string | null };
type Register = { id: string; name: string };

export default function PosShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [selectedRegister, setSelectedRegister] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [shiftRes, regRes] = await Promise.all([
        fetch("/api/pos/shifts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/pos/registers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (shiftRes.ok) { const d = await shiftRes.json(); setShifts(d.shifts ?? []); }
      if (regRes.ok) { const d = await regRes.json(); setRegisters(d.registers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    if (!selectedRegister) return;
    await fetch("/api/pos/shifts", { method: "POST", headers, body: JSON.stringify({ register_id: selectedRegister, opening_cash: Number(openingCash) || 0 }) });
    setShowOpenForm(false); setOpeningCash(""); await load();
  };

  const handleClose = async () => {
    if (!selectedShift) return;
    await fetch(`/api/pos/shifts/${selectedShift.id}/close`, { method: "POST", headers, body: JSON.stringify({ closing_cash: Number(closingCash) || 0 }) });
    setShowCloseForm(false); setClosingCash(""); setSelectedShift(null); await load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading shifts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Shifts</h1>
        <button onClick={() => setShowOpenForm(true)} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Open Shift</button>
      </div>

      {/* Open Shift Form */}
      {showOpenForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Open Shift</h2>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">Register</label>
            <div className="flex flex-wrap gap-2">
              {registers.map((r) => (
                <button key={r.id} onClick={() => setSelectedRegister(r.id)} className={`rounded-lg px-4 py-2 text-xs font-medium ${selectedRegister === r.id ? "bg-purple-600 text-white" : "border border-gray-100 text-gray-600"}`}>{r.name}</button>
              ))}
              {registers.length === 0 && <p className="text-xs text-gray-400">No registers available</p>}
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-500">Opening Cash</label>
            <input value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} type="number" placeholder="0.00" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowOpenForm(false)} className="flex-1 rounded-xl border border-gray-100 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
            <button onClick={handleOpen} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white">Open</button>
          </div>
        </div>
      )}

      {/* Close Shift Form */}
      {showCloseForm && selectedShift && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Close Shift</h2>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-500">Closing Cash</label>
            <input value={closingCash} onChange={(e) => setClosingCash(e.target.value)} type="number" placeholder="0.00" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCloseForm(false); setSelectedShift(null); }} className="flex-1 rounded-xl border border-gray-100 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
            <button onClick={handleClose} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white">Close</button>
          </div>
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No shifts</p>
          <p className="text-xs text-gray-400">Open a shift to start accepting orders.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => {
            const variance = s.status === "closed" ? (Number(s.closing_cash) - (Number(s.opening_cash) + Number(s.total_sales ?? 0))).toFixed(2) : null;
            return (
              <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Shift</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                </div>
                <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Opening Cash</span><span className="text-xs text-gray-900">${Number(s.opening_cash).toFixed(2)}</span></div>
                {s.status === "closed" && (
                  <>
                    <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Closing Cash</span><span className="text-xs text-gray-900">${Number(s.closing_cash ?? 0).toFixed(2)}</span></div>
                    <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Total Sales</span><span className="text-xs font-semibold text-gray-900">${Number(s.total_sales ?? 0).toFixed(2)}</span></div>
                    {variance && (
                      <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Variance</span><span className={`text-xs font-semibold ${Number(variance) === 0 ? "text-emerald-500" : "text-rose-500"}`}>${variance}</span></div>
                    )}
                  </>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">Opened: {new Date(s.opened_at).toLocaleString()}</p>
                  {s.status === "open" && (
                    <button onClick={() => { setSelectedShift(s); setShowCloseForm(true); }} className="rounded bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">Close Shift</button>
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
