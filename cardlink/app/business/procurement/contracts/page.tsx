"use client";

import { useEffect, useState, useCallback } from "react";

type Contract = { id: string; title: string; contract_number: string | null; supplier_id: string | null; status: string; start_date: string | null; end_date: string | null; value: number; created_at: string };
type Supplier = { id: string; name: string };

const statusColors: Record<string, string> = { draft: "bg-neutral-100 text-neutral-600", active: "bg-green-100 text-green-700", expired: "bg-yellow-100 text-yellow-700", terminated: "bg-red-100 text-red-700" };

export default function ProcurementContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [value, setValue] = useState("0");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [conRes, supRes] = await Promise.all([
        fetch("/api/procurement/contracts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (conRes.ok) { const d = await conRes.json(); setContracts(d.contracts ?? []); }
      if (supRes.ok) { const d = await supRes.json(); setSuppliers(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const contractNumber = `CON-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/procurement/contracts", { method: "POST", headers, body: JSON.stringify({ title: title.trim(), contract_number: contractNumber, supplier_id: supplierId || null, status: "draft", start_date: startDate || null, end_date: endDate || null, value: Number(value) || 0 }) });
      setShowForm(false); setTitle(""); setSupplierId(""); setStartDate(""); setEndDate(""); setValue("0"); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/procurement/contracts/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    await load();
  };

  const filtered = contracts.filter((c) => filter === "all" || c.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading contracts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Vendor Contracts</h1>
          <p className="text-xs text-neutral-500">{contracts.length} contract(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Contract</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "active", "expired", "terminated"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">New Contract</h2>
          <input type="text" placeholder="Contract title *" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" />
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm">
            <option value="">Select supplier (optional)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input type="date" placeholder="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-neutral-100 px-3 py-2 text-sm" />
            <input type="date" placeholder="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-neutral-100 px-3 py-2 text-sm" />
            <input type="number" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-neutral-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Creating…" : "Create"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">No contracts</p>}
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-neutral-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{c.title}</p>
                <p className="text-xs text-neutral-500">
                  {c.contract_number ?? "—"} · {c.supplier_id ? (supplierMap[c.supplier_id] ?? "—") : "No supplier"} · ${Number(c.value).toLocaleString()}
                </p>
                {(c.start_date || c.end_date) && (
                  <p className="text-xs text-neutral-400">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}</p>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[c.status] ?? "bg-neutral-100 text-neutral-600"}`}>{c.status}</span>
            </div>
            {c.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(c.id, "active")} className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Activate</button>
                <button onClick={() => updateStatus(c.id, "terminated")} className="rounded-lg bg-neutral-100 px-3 py-1 text-xs text-neutral-500">Terminate</button>
              </div>
            )}
            {c.status === "active" && (
              <button onClick={() => updateStatus(c.id, "terminated")} className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Terminate</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
