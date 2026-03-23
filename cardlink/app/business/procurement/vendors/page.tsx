"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, X, Users, UserCheck, Mail, Phone, PackageOpen } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_terms: string | null;
  currency: string | null;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  rating: number;
  created_at: string;
};

const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };
const PAYMENT_TERM_OPTIONS = ["immediate", "net_7", "net_15", "net_30", "net_45", "net_60", "net_90"];
const termLabel = (t: string) => t.replace(/_/g, " ");

const TERM_COLORS: Record<string, string> = {
  immediate: "bg-green-50 text-green-600",
  net_7: "bg-teal-50 text-teal-600",
  net_15: "bg-sky-50 text-sky-600",
  net_30: "bg-indigo-50 text-indigo-600",
  net_45: "bg-violet-50 text-violet-600",
  net_60: "bg-amber-50 text-amber-600",
  net_90: "bg-red-50 text-red-600",
};

function PaymentBadge({ terms }: { terms: string | null }) {
  if (!terms) return null;
  const color = TERM_COLORS[terms] ?? "bg-gray-50 text-gray-600";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${color}`}>
      {termLabel(terms)}
    </span>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

const EMPTY_FORM = {
  name: "",
  contact_name: "",
  contact_phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  payment_terms: "net_30",
  category: "",
  notes: "",
};

export default function ProcurementVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/procurement/suppliers", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setVendors(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (v: Vendor) => {
    setForm({
      name: v.name,
      contact_name: v.contact_name ?? "",
      contact_phone: v.contact_phone ?? "",
      email: v.email ?? "",
      address: v.address ?? "",
      city: v.city ?? "",
      country: v.country ?? "",
      payment_terms: v.payment_terms ?? "net_30",
      category: v.category ?? "",
      notes: v.notes ?? "",
    });
    setEditId(v.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      payment_terms: form.payment_terms,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editId) {
        await fetch(`/api/procurement/suppliers/${editId}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/procurement/suppliers", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) });
      }
      setShowForm(false); resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/procurement/suppliers/${deleteTarget.id}`, { method: "DELETE", headers: HEADERS });
      setDeleteTarget(null); await load();
    } catch { /* silent */ } finally { setDeleting(false); }
  };

  // derived data
  const categories = Array.from(new Set(vendors.map((v) => v.category).filter(Boolean))) as string[];
  const q = search.toLowerCase();
  const filtered = vendors.filter((v) => {
    const matchesSearch = !q || v.name.toLowerCase().includes(q) ||
      (v.email ?? "").toLowerCase().includes(q) || (v.category ?? "").toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const activeCount = vendors.filter((v) => v.is_active).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
        <p className="text-sm text-gray-500">Loading vendors…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors / Suppliers</h1>
          <p className="text-xs text-gray-500">Manage your procurement partners</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus size={15} /> Add Vendor
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <Users size={18} className="text-indigo-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{vendors.length}</p>
            <p className="text-[11px] text-gray-500">Total Vendors</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <UserCheck size={18} className="text-green-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{activeCount}</p>
            <p className="text-[11px] text-gray-500">Active Vendors</p>
          </div>
        </div>
      </div>

      {/* Search + Category filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, email, or category…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Inline form (create / edit) */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{editId ? "Edit Vendor" : "New Vendor"}</h2>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <input type="text" placeholder="Vendor name *" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Contact name" value={form.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} className={inputClass} />
            <input type="text" placeholder="Phone" value={form.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} />
            <input type="text" placeholder="Category" value={form.category} onChange={(e) => updateField("category", e.target.value)} className={inputClass} />
          </div>
          <input type="text" placeholder="Address" value={form.address} onChange={(e) => updateField("address", e.target.value)} className={inputClass} />
          <div className="grid grid-cols-3 gap-3">
            <input type="text" placeholder="City" value={form.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
            <input type="text" placeholder="Country" value={form.country} onChange={(e) => updateField("country", e.target.value)} className={inputClass} />
            <select value={form.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} className={inputClass}>
              {PAYMENT_TERM_OPTIONS.map((t) => <option key={t} value={t}>{termLabel(t)}</option>)}
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className={inputClass} rows={2} />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update Vendor" : "Create Vendor"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Delete <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting…" : "Confirm Delete"}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Vendor list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <PackageOpen size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No vendors found</p>
            <p className="text-xs text-gray-400">
              {vendors.length === 0 ? "Add your first vendor to get started" : "Try adjusting your search or filter"}
            </p>
          </div>
        )}

        {filtered.map((v) => (
          <div key={v.id} className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                {v.category && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{v.category}</span>
                )}
                <PaymentBadge terms={v.payment_terms} />
                {!v.is_active && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">Inactive</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {v.email && (
                  <span className="flex items-center gap-1"><Mail size={12} className="text-gray-400" />{v.email}</span>
                )}
                {v.contact_phone && (
                  <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{v.contact_phone}</span>
                )}
                {v.contact_name && <span>{v.contact_name}</span>}
              </div>
              {(v.city || v.country) && (
                <p className="text-xs text-gray-400">{[v.city, v.country].filter(Boolean).join(", ")}</p>
              )}
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <button onClick={() => openEdit(v)} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700" title="Edit vendor">
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeleteTarget(v)} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600" title="Delete vendor">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
