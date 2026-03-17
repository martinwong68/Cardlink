"use client";

import { useEffect, useState, useCallback } from "react";

type Vendor = { id: string; name: string; contact_name: string | null; contact_phone: string | null; created_at: string };

export default function ProcurementVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/procurement/suppliers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setVendors(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(""); setContactName(""); setContactPhone(""); setEditId(null); };
  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (v: Vendor) => { setName(v.name); setContactName(v.contact_name ?? ""); setContactPhone(v.contact_phone ?? ""); setEditId(v.id); setShowForm(true); };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name: name.trim(), contact_name: contactName.trim() || null, contact_phone: contactPhone.trim() || null };
    try {
      if (editId) { await fetch(`/api/procurement/suppliers/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/procurement/suppliers", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const filtered = vendors.filter((v) => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading vendors…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors / Suppliers</h1>
          <p className="text-xs text-gray-500">{vendors.length} vendor(s)</p>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ Add Vendor</button>
      </div>

      <input type="text" placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-100 px-4 py-2 text-sm focus:border-purple-400 focus:outline-none" />

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">{editId ? "Edit Vendor" : "New Vendor"}</h2>
          <input type="text" placeholder="Vendor name *" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input type="text" placeholder="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No vendors found</p>}
        {filtered.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{v.name}</p>
              <p className="text-xs text-gray-500">{v.contact_name ?? "—"} · {v.contact_phone ?? "—"}</p>
            </div>
            <button onClick={() => openEdit(v)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
