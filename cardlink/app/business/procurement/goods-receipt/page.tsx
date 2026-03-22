"use client";

import { useEffect, useState, useCallback } from "react";

type ReceiptItem = { id: string; product_id: string; qty: number };
type GoodsReceipt = { id: string; po_id: string; received_at: string; received_by: string | null; note: string | null; created_at: string; items: ReceiptItem[] };
type POItem = { id: string; product_id: string; qty: number; unit_cost: number };
type PO = { id: string; po_number: string; status: string; items: POItem[] };

export default function ProcurementGoodsReceiptPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poId, setPoId] = useState("");
  const [note, setNote] = useState("");
  const [receiveItems, setReceiveItems] = useState<{ po_item_id: string; product_id: string; qty: number }[]>([]);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [recRes, poRes] = await Promise.all([
        fetch("/api/procurement/receipts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/purchase-orders", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (recRes.ok) { const d = await recRes.json(); setReceipts(d.receipts ?? []); }
      if (poRes.ok) { const d = await poRes.json(); setPurchaseOrders(d.purchase_orders ?? d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const receivablePOs = purchaseOrders.filter((p) => p.status === "submitted" || p.status === "ordered" || p.status === "partial");
  const poMap = Object.fromEntries(purchaseOrders.map((p) => [p.id, p.po_number]));

  const handlePoSelect = (selectedPoId: string) => {
    setPoId(selectedPoId);
    const po = purchaseOrders.find((p) => p.id === selectedPoId);
    if (po && Array.isArray(po.items)) {
      setReceiveItems(po.items.map((item) => ({ po_item_id: item.id, product_id: item.product_id, qty: item.qty })));
    } else {
      setReceiveItems([]);
    }
  };

  const updateItemQty = (idx: number, qty: number) => {
    setReceiveItems((prev) => prev.map((item, i) => i === idx ? { ...item, qty } : item));
  };

  const handleCreate = async () => {
    if (!poId || receiveItems.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/procurement/receipts", {
        method: "POST", headers,
        body: JSON.stringify({
          po_id: poId,
          note: note.trim() || null,
          items: receiveItems.filter((i) => i.qty > 0),
        }),
      });
      setShowForm(false); setPoId(""); setNote(""); setReceiveItems([]); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading receipts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goods Receipts</h1>
          <p className="text-xs text-gray-500">{receipts.length} receipt(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Receipt</button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Record Goods Receipt</h2>
          <select value={poId} onChange={(e) => handlePoSelect(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <option value="">Select purchase order…</option>
            {receivablePOs.map((p) => <option key={p.id} value={p.id}>{p.po_number} ({p.status})</option>)}
          </select>

          {receiveItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items to Receive</p>
              {receiveItems.map((item, idx) => (
                <div key={item.po_item_id} className="flex items-center gap-3 rounded-lg border border-gray-50 bg-gray-50 px-3 py-2">
                  <p className="flex-1 text-xs text-gray-600 truncate">{item.product_id.slice(0, 8)}…</p>
                  <label className="text-[10px] text-gray-500">Qty:</label>
                  <input type="number" min="0" value={item.qty} onChange={(e) => updateItemQty(idx, Number(e.target.value))} className="w-20 rounded border border-gray-200 px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          )}

          <textarea placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !poId || receiveItems.length === 0} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Create Receipt"}</button>
            <button onClick={() => { setShowForm(false); setPoId(""); setReceiveItems([]); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {receipts.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No goods receipts</p>}
        {receipts.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Receipt for {poMap[r.po_id] ?? r.po_id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">Received {new Date(r.received_at).toLocaleString()}</p>
                {r.note && <p className="mt-1 text-xs text-gray-400">{r.note}</p>}
                {Array.isArray(r.items) && r.items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{r.items.length} item(s) · Total qty: {r.items.reduce((sum, i) => sum + Number(i.qty), 0)}</p>
                )}
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Received</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
