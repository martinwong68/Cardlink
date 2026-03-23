"use client";

import { useEffect, useState, useCallback } from "react";
import { Ruler, Plus, Loader2, Star } from "lucide-react";

type UoM = {
  id: string;
  name: string;
  abbreviation: string;
  category: string;
  is_base: boolean;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

const CATEGORY_COLORS: Record<string, string> = {
  quantity: "bg-blue-100 text-blue-700",
  weight: "bg-green-100 text-green-700",
  volume: "bg-purple-100 text-purple-700",
  length: "bg-amber-100 text-amber-700",
  area: "bg-teal-100 text-teal-700",
  time: "bg-gray-100 text-gray-600",
};

const CATEGORIES = ["quantity", "weight", "volume", "length", "area", "time"] as const;

export default function UoMPage() {
  const [uoms, setUoms] = useState<UoM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formAbbr, setFormAbbr] = useState("");
  const [formCategory, setFormCategory] = useState<string>("quantity");
  const [formIsBase, setFormIsBase] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/inventory/uom", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setUoms(d.uoms ?? []); }
      else setError("Failed to load units");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setShowForm(false); setFormName(""); setFormAbbr(""); setFormCategory("quantity"); setFormIsBase(false); };

  const handleCreate = async () => {
    if (!formName.trim() || !formAbbr.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/uom", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ name: formName.trim(), abbreviation: formAbbr.trim(), category: formCategory, is_base: formIsBase }),
      });
      if (res.ok) { resetForm(); await load(); } else setError("Failed to create unit");
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Units of Measure</h1>
          <p className="text-xs text-gray-500">{uoms.length} units</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Unit of Measure</h3>
          <div className="grid grid-cols-2 gap-2">
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name *" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formAbbr} onChange={(e) => setFormAbbr(e.target.value)} placeholder="Abbreviation *" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="mt-1 w-full appearance-none rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formIsBase} onChange={(e) => setFormIsBase(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-xs font-medium text-gray-700">Base unit for this category</span>
          </label>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !formName.trim() || !formAbbr.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : uoms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Ruler className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No units of measure defined</p>
        </div>
      ) : (
        <div className="space-y-2">
          {uoms.map((u) => (
            <div key={u.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                  <span className="text-xs text-gray-500">({u.abbreviation})</span>
                  {u.is_base && (
                    <span className="flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      <Star className="h-2.5 w-2.5" /> Base
                    </span>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_COLORS[u.category] ?? "bg-gray-100 text-gray-600"}`}>{u.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
