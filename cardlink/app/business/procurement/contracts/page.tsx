"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Plus, Pencil, Trash2, X, FileText,
  ClipboardList, ShieldCheck, AlertTriangle, PackageOpen,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────── */
type Contract = {
  id: string; supplier_id: string | null; contract_number: string | null;
  title: string; start_date: string | null; end_date: string | null;
  value: number; status: string; terms: string | null; auto_renew: boolean;
  created_at: string;
};
type Supplier = { id: string; name: string };

/* ── constants ─────────────────────────────────────────── */
const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", active: "bg-green-100 text-green-700",
  expired: "bg-yellow-100 text-yellow-700", cancelled: "bg-red-100 text-red-700",
};
const STATUSES = ["all", "draft", "active", "expired", "cancelled"] as const;
const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : Infinity;

/* ── page ──────────────────────────────────────────────── */
export default function ProcurementContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [value, setValue] = useState("0");
  const [terms, setTerms] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── data fetching ───────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/procurement/contracts", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setContracts(d.contracts ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setSuppliers(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  /* ── form helpers ────────────────────────────────────── */
  const resetForm = () => {
    setEditId(null); setTitle(""); setSupplierId(""); setStartDate("");
    setEndDate(""); setValue("0"); setTerms(""); setAutoRenew(false);
  };
  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (c: Contract) => {
    setEditId(c.id); setTitle(c.title); setSupplierId(c.supplier_id ?? "");
    setStartDate(c.start_date ?? ""); setEndDate(c.end_date ?? "");
    setValue(String(c.value)); setTerms(c.terms ?? ""); setAutoRenew(c.auto_renew);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      title: title.trim(), supplier_id: supplierId || null,
      start_date: startDate || null, end_date: endDate || null,
      value: Number(value) || 0, terms: terms || null, auto_renew: autoRenew,
    };
    try {
      if (editId) {
        await fetch("/api/procurement/contracts", {
          method: "PATCH", headers: JSON_HEADERS,
          body: JSON.stringify({ id: editId, ...body }),
        });
      } else {
        await fetch("/api/procurement/contracts", {
          method: "POST", headers: JSON_HEADERS,
          body: JSON.stringify({ ...body, contract_number: `CON-${Date.now().toString(36).toUpperCase()}`, status: "draft" }),
        });
      }
      setShowForm(false); resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const toggleStatus = async (c: Contract) => {
    const next: Record<string, string> = { draft: "active", active: "cancelled", expired: "active", cancelled: "draft" };
    await fetch("/api/procurement/contracts", {
      method: "PATCH", headers: JSON_HEADERS,
      body: JSON.stringify({ id: c.id, status: next[c.status] ?? "draft" }),
    });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch("/api/procurement/contracts", {
        method: "PATCH", headers: JSON_HEADERS,
        body: JSON.stringify({ id: deleteTarget.id, status: "cancelled" }),
      });
      setDeleteTarget(null); await load();
    } catch { /* silent */ } finally { setDeleting(false); }
  };

  /* ── derived ─────────────────────────────────────────── */
  const q = search.toLowerCase();
  const filtered = contracts
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) =>
      c.title.toLowerCase().includes(q)
      || (c.contract_number ?? "").toLowerCase().includes(q)
      || (supplierMap[c.supplier_id ?? ""] ?? "").toLowerCase().includes(q),
    );
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const expiringSoon = contracts.filter((c) => c.status === "active" && daysUntil(c.end_date) <= 30 && daysUntil(c.end_date) >= 0).length;

  /* ── loading state ───────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
        <p className="text-sm text-gray-500">Loading contracts…</p>
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="space-y-4 pb-28">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendor Contracts</h1>
          <p className="text-xs text-gray-500">{contracts.length} contract(s)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus size={15} /> New
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <ClipboardList size={18} className="text-indigo-500" />
          <div><p className="text-lg font-bold text-gray-900">{contracts.length}</p><p className="text-[11px] text-gray-500">Total</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <ShieldCheck size={18} className="text-green-500" />
          <div><p className="text-lg font-bold text-gray-900">{activeCount}</p><p className="text-[11px] text-gray-500">Active</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <AlertTriangle size={18} className="text-amber-500" />
          <div><p className="text-lg font-bold text-gray-900">{expiringSoon}</p><p className="text-[11px] text-gray-500">Expiring Soon</p></div>
        </div>
      </div>

      {/* search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search title, number, or supplier…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* delete confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">Cancel contract <span className="font-semibold">{deleteTarget.title}</span>? This will set its status to cancelled.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{deleting ? "Cancelling…" : "Confirm"}</button>
            <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Dismiss</button>
          </div>
        </div>
      )}

      {/* create / edit form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{editId ? "Edit Contract" : "New Contract"}</h2>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <input type="text" placeholder="Contract title *" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
            <option value="">Select supplier (optional)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
          </div>
          <textarea placeholder="Terms & conditions" value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="rounded border-gray-300" /> Auto-renew
          </label>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update Contract" : "Create Contract"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* contract list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <PackageOpen size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No contracts found</p>
            <p className="text-xs text-gray-400">{contracts.length === 0 ? "Add your first contract to get started" : "Try adjusting your search or filter"}</p>
          </div>
        )}
        {filtered.map((c) => {
          const days = daysUntil(c.end_date);
          const expiring = c.status === "active" && days >= 0 && days <= 30;
          return (
            <div key={c.id} className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                  {expiring && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Expires in {days}d</span>}
                  {c.auto_renew && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">Auto-renew</span>}
                </div>
                <p className="text-xs text-gray-500">
                  <FileText size={11} className="mr-1 inline" />
                  {c.contract_number ?? "—"} · {c.supplier_id ? (supplierMap[c.supplier_id] ?? "Unknown") : "No supplier"} · ${Number(c.value).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{fmt(c.start_date)} → {fmt(c.end_date)}</p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-1.5">
                <button onClick={() => toggleStatus(c)} className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200">
                  {{ draft: "Activate", active: "Cancel", expired: "Renew", cancelled: "Reopen" }[c.status] ?? "Toggle"}
                </button>
                <button onClick={() => openEdit(c)} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"><Pencil size={14} /></button>
                <button onClick={() => setDeleteTarget(c)} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
