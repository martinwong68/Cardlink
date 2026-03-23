"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type Category = { id: string; name: string; parent_id: string | null; sort_order: number };

export default function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/categories", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setCategories(d.categories ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST", headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parent_id: parentId || null }),
      });
      if (res.ok) { setShowForm(false); setName(""); setParentId(""); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading categories…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Categories ({categories.length})</h2>
        <button onClick={() => { setName(""); setParentId(""); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Category</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name *" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          {categories.length > 0 && (
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <option value="">No parent (top-level)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {categories.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No categories yet. Create your first category above.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const parent = categories.find((p) => p.id === c.parent_id);
            return (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  {parent && <p className="text-xs text-gray-500">Parent: {parent.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
