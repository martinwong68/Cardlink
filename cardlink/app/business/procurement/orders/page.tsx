"use client";

import { useEffect, useState, useCallback } from "react";

type PO = { id: string; po_number: string; supplier_id: string; status: string; ordered_at: string | null; expected_at: string | null; created_at: string };
type Supplier = { id: string; name: string };

const statusColors: Record<string, string> = { draft: "bg-neutral-100 text-neutral-600", submitted: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function ProcurementOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [poRes, supRes] = await Promise.all([
        fetch("/api/procurement/purchase-orders", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (poRes.ok) { const d = await poRes.json(); setOrders(d.purchase_orders ?? d.orders ?? []); }
      if (supRes.ok) { const d = await supRes.json(); setSuppliers(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  const handleCreate = async () => {
    if (!supplierId) return;
    setSaving(true);
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/procurement/purchase-orders", { method: "POST", headers, body: JSON.stringify({ po_number: poNumber, supplier_id: supplierId, status: "draft", expected_at: expectedAt || null }) });
      setShowForm(false); setSupplierId(""); setExpectedAt(""); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/procurement/purchase-orders/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    await load();
  };

  const filtered = orders.filter((o) => filter === "all" || o.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading purchase orders…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Purchase Orders</h1>
          <p className="text-xs text-neutral-500">{orders.length} order(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New PO</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "submitted", "received", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">New Purchase Order</h2>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm">
            <option value="">Select supplier…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" placeholder="Expected delivery" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !supplierId} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Creating…" : "Create PO"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">No purchase orders</p>}
        {filtered.map((po) => (
          <div key={po.id} className="rounded-xl border border-neutral-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{po.po_number}</p>
                <p className="text-xs text-neutral-500">{supplierMap[po.supplier_id] ?? "Unknown"} · {po.expected_at ? `Expected: ${new Date(po.expected_at).toLocaleDateString()}` : "No ETA"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[po.status] ?? "bg-neutral-100 text-neutral-600"}`}>{po.status}</span>
            </div>
            {po.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(po.id, "submitted")} className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Submit</button>
                <button onClick={() => updateStatus(po.id, "cancelled")} className="rounded-lg bg-neutral-100 px-3 py-1 text-xs text-neutral-500">Cancel</button>
              </div>
            )}
            {po.status === "submitted" && (
              <button onClick={() => updateStatus(po.id, "received")} className="mt-2 rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Mark Received</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
