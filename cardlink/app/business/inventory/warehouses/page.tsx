"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
};

export default function InventoryWarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/warehouses", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setWarehouses(d.warehouses ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(""); setCode(""); setAddress(""); setIsDefault(false); };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/warehouses", {
        method: "POST", headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim(), address: address.trim() || null, is_default: isDefault }),
      });
      if (res.ok) { setShowForm(false); resetForm(); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading warehouses…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Warehouses ({warehouses.length})</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Warehouse</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name *" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. WH-01) *" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            Default warehouse
          </label>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {warehouses.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No warehouses configured. Add your first warehouse above.
        </div>
      ) : (
        <div className="space-y-2">
          {warehouses.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{w.name}</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{w.code}</span>
                  {w.is_default && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Default</span>}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${w.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {w.address && <p className="text-xs text-gray-500 mt-0.5">{w.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
