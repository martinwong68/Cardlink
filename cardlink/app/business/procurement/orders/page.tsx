"use client";

import { useEffect, useState, useCallback } from "react";

type POItem = { id: string; product_id: string; qty: number; unit_cost: number };
type PO = { id: string; po_number: string; supplier_id: string; status: string; ordered_at: string | null; expected_at: string | null; notes: string | null; request_id: string | null; items: POItem[]; created_at: string };
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string };

const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700", ordered: "bg-indigo-100 text-indigo-700", partial: "bg-yellow-100 text-yellow-700", received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function ProcurementOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<{ product_id: string; qty: string; unit_cost: string }[]>([{ product_id: "", qty: "1", unit_cost: "0" }]);
  const [expandedPo, setExpandedPo] = useState<string | null>(null);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        fetch("/api/procurement/purchase-orders", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (poRes.ok) { const d = await poRes.json(); setOrders(d.purchase_orders ?? d.orders ?? []); }
      if (supRes.ok) { const d = await supRes.json(); setSuppliers(d.suppliers ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const productMap = Object.fromEntries(products.map((p) => [p.id, `${p.name} (${p.sku})`]));

  const addLineItem = () => setLineItems((prev) => [...prev, { product_id: "", qty: "1", unit_cost: "0" }]);
  const removeLineItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: string, value: string) => {
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleCreate = async () => {
    if (!supplierId) return;
    const validItems = lineItems.filter((item) => item.product_id && Number(item.qty) > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/procurement/purchase-orders", {
        method: "POST", headers,
        body: JSON.stringify({
          po_number: poNumber,
          supplier_id: supplierId,
          expected_at: expectedAt || null,
          notes: notes.trim() || null,
          items: validItems.map((item) => ({
            product_id: item.product_id,
            qty: Number(item.qty),
            unit_cost: Number(item.unit_cost) || 0,
          })),
        }),
      });
      setShowForm(false); setSupplierId(""); setExpectedAt(""); setNotes("");
      setLineItems([{ product_id: "", qty: "1", unit_cost: "0" }]);
      await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/procurement/purchase-orders/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    await load();
  };

  const filtered = orders.filter((o) => filter === "all" || o.status === filter);

  const calcTotal = (items: POItem[]) => items.reduce((sum, i) => sum + Number(i.qty) * Number(i.unit_cost), 0);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading purchase orders…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-xs text-gray-500">{orders.length} order(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New PO</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "submitted", "ordered", "partial", "received", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">New Purchase Order</h2>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <option value="">Select supplier *</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" placeholder="Expected delivery" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Items</p>
              <button onClick={addLineItem} className="text-xs text-purple-600 font-semibold hover:underline">+ Add Item</button>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={item.product_id} onChange={(e) => updateLineItem(idx, "product_id", e.target.value)} className="flex-1 rounded-lg border border-gray-100 px-2 py-1.5 text-sm">
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => updateLineItem(idx, "qty", e.target.value)} className="w-20 rounded-lg border border-gray-100 px-2 py-1.5 text-sm" />
                <input type="number" min="0" step="0.01" placeholder="Cost" value={item.unit_cost} onChange={(e) => updateLineItem(idx, "unit_cost", e.target.value)} className="w-24 rounded-lg border border-gray-100 px-2 py-1.5 text-sm" />
                {lineItems.length > 1 && (
                  <button onClick={() => removeLineItem(idx)} className="text-xs text-red-500 hover:underline">×</button>
                )}
              </div>
            ))}
          </div>

          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !supplierId} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Creating…" : "Create PO"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No purchase orders</p>}
        {filtered.map((po) => (
          <div key={po.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{po.po_number}</p>
                  {po.request_id && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">From PR</span>}
                </div>
                <p className="text-xs text-gray-500">
                  {supplierMap[po.supplier_id] ?? "Unknown"}
                  {po.expected_at ? ` · Expected: ${new Date(po.expected_at).toLocaleDateString()}` : ""}
                  {Array.isArray(po.items) && po.items.length > 0 ? ` · ${po.items.length} item(s) · $${calcTotal(po.items).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[po.status] ?? "bg-gray-100 text-gray-600"}`}>{po.status}</span>
                <button onClick={() => setExpandedPo(expandedPo === po.id ? null : po.id)} className="text-xs text-gray-400 hover:text-gray-600">{expandedPo === po.id ? "▲" : "▼"}</button>
              </div>
            </div>

            {expandedPo === po.id && Array.isArray(po.items) && po.items.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-gray-50 pt-2">
                {po.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-500">
                    <span>{productMap[item.product_id] ?? item.product_id.slice(0, 8)}</span>
                    <span>{item.qty} × ${Number(item.unit_cost).toFixed(2)} = ${(Number(item.qty) * Number(item.unit_cost)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {po.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(po.id, "submitted")} className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Submit</button>
                <button onClick={() => updateStatus(po.id, "cancelled")} className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">Cancel</button>
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
