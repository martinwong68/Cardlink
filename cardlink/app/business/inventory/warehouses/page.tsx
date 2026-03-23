"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Warehouse, Pencil, Trash2, Star, Power } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type WarehouseT = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
};

async function postWarehouse(body: Record<string, unknown>) {
  return fetch("/api/inventory/warehouses", {
    method: "POST",
    headers: { ...HEADERS, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function InventoryWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const startEdit = (w: WarehouseT) => {
    setEditingId(w.id);
    setName(w.name);
    setCode(w.code);
    setAddress(w.address ?? "");
    setIsDefault(w.is_default);
    setShowForm(false);
  };

  const cancelEdit = () => { setEditingId(null); resetForm(); };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(), code: code.trim(),
        address: address.trim() || null, is_default: isDefault,
      };
      if (editingId) body.id = editingId;
      const res = await postWarehouse(body);
      if (res.ok) { setShowForm(false); setEditingId(null); resetForm(); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const toggleActive = async (w: WarehouseT) => {
    setBusyId(w.id);
    try {
      const res = await postWarehouse({ id: w.id, name: w.name, code: w.code, address: w.address, is_active: !w.is_active, is_default: w.is_default });
      if (res.ok) await load();
    } catch { /* silent */ } finally { setBusyId(null); }
  };

  const setDefault = async (w: WarehouseT) => {
    setBusyId(w.id);
    try {
      const res = await postWarehouse({ id: w.id, name: w.name, code: w.code, address: w.address, is_active: w.is_active, is_default: true });
      if (res.ok) await load();
    } catch { /* silent */ } finally { setBusyId(null); }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/inventory/warehouses", {
        method: "DELETE",
        headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await load();
    } catch { /* silent */ } finally { setBusyId(null); setDeleteId(null); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  }, [warehouses, search]);

  const activeCount = warehouses.filter((w) => w.is_active).length;
  const defaultWh = warehouses.find((w) => w.is_default);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading warehouses…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Warehouses</h2>
        <button onClick={() => { cancelEdit(); resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Stats */}
      {warehouses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{warehouses.length}</p>
            <p className="text-[11px] text-gray-500">Total</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{activeCount}</p>
            <p className="text-[11px] text-gray-500">Active</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center">
            <p className="text-sm font-bold text-indigo-600 truncate">{defaultWh?.name ?? "—"}</p>
            <p className="text-[11px] text-gray-500">Default</p>
          </div>
        </div>
      )}

      {/* Search */}
      {warehouses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
      )}

      {/* Create / Edit form */}
      {(showForm || editingId) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">{editingId ? "Edit Warehouse" : "New Warehouse"}</h3>
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
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); cancelEdit(); }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">Delete this warehouse? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => handleDelete(deleteId)} disabled={busyId === deleteId} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {busyId === deleteId ? "Deleting…" : "Confirm"}
            </button>
            <button onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {warehouses.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Warehouse className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No warehouses yet</p>
          <p className="mt-1 text-xs text-gray-400">Add your first warehouse to start managing inventory locations.</p>
        </div>
      ) : filtered.length === 0 && search.trim() ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No warehouses match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{w.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{w.code}</span>
                    {w.is_default && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Default</span>}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${w.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                      {w.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {w.address && <p className="text-xs text-gray-500 mt-0.5 truncate">{w.address}</p>}
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  {!w.is_default && (
                    <button onClick={() => setDefault(w)} disabled={busyId === w.id} title="Set as default" className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => toggleActive(w)} disabled={busyId === w.id} title={w.is_active ? "Deactivate" : "Activate"} className={`rounded-lg p-1.5 disabled:opacity-50 ${w.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}>
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => startEdit(w)} title="Edit" className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(w.id)} title="Delete" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
