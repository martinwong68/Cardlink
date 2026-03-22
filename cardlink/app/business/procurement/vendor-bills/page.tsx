"use client";

import { useEffect, useState, useCallback } from "react";

type Bill = { id: string; bill_number: string; supplier_id: string; po_id: string | null; status: string; bill_date: string; due_date: string | null; total_amount: number; notes: string | null; created_at: string };
type Supplier = { id: string; name: string };
type PO = { id: string; po_number: string };

const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-600", pending: "bg-yellow-100 text-yellow-700", approved: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function ProcurementVendorBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [bRes, sRes, poRes] = await Promise.all([
        fetch("/api/procurement/vendor-bills", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/purchase-orders", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBills(d.bills ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setSuppliers(d.suppliers ?? []); }
      if (poRes.ok) { const d = await poRes.json(); setPurchaseOrders(d.purchase_orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const poMap = Object.fromEntries(purchaseOrders.map((p) => [p.id, p.po_number]));

  const handleCreate = async () => {
    if (!supplierId) return;
    setSaving(true);
    const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/procurement/vendor-bills", {
        method: "POST", headers,
        body: JSON.stringify({
          supplier_id: supplierId,
          po_id: poId || null,
          bill_number: billNumber,
          bill_date: billDate,
          due_date: dueDate || null,
          total_amount: Number(totalAmount) || 0,
          subtotal: Number(totalAmount) || 0,
          notes: notes.trim() || null,
        }),
      });
      setShowForm(false); setSupplierId(""); setPoId(""); setTotalAmount("0"); setNotes(""); setDueDate(""); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/procurement/vendor-bills/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    await load();
  };

  const filtered = bills.filter((b) => filter === "all" || b.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading vendor bills…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendor Bills</h1>
          <p className="text-xs text-gray-500">{bills.length} bill(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Bill</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "pending", "approved", "paid", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">New Vendor Bill</h2>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <option value="">Select supplier *</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <option value="">Link to PO (optional)</option>
            {purchaseOrders.map((p) => <option key={p.id} value={p.id}>{p.po_number}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Bill Date</label>
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Total Amount</label>
              <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !supplierId} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Creating…" : "Create Bill"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No vendor bills</p>}
        {filtered.map((b) => (
          <div key={b.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.bill_number}</p>
                <p className="text-xs text-gray-500">
                  {supplierMap[b.supplier_id] ?? "Unknown"} · ${Number(b.total_amount).toLocaleString()}
                  {b.po_id && ` · PO: ${poMap[b.po_id] ?? "—"}`}
                </p>
                <p className="text-xs text-gray-400">
                  Billed: {new Date(b.bill_date).toLocaleDateString()}
                  {b.due_date && ` · Due: ${new Date(b.due_date).toLocaleDateString()}`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.status}</span>
            </div>
            {b.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(b.id, "pending")} className="rounded-lg bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">Submit</button>
                <button onClick={() => updateStatus(b.id, "cancelled")} className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">Cancel</button>
              </div>
            )}
            {b.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(b.id, "approved")} className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Approve</button>
                <button onClick={() => updateStatus(b.id, "cancelled")} className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">Cancel</button>
              </div>
            )}
            {b.status === "approved" && (
              <button onClick={() => updateStatus(b.id, "paid")} className="mt-2 rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Mark Paid</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
