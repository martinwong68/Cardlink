"use client";

import { useEffect, useState, useCallback } from "react";

type GoodsReceipt = { id: string; po_id: string; received_at: string; received_by: string | null; note: string | null; created_at: string };
type PO = { id: string; po_number: string };

export default function ProcurementGoodsReceiptPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poId, setPoId] = useState("");
  const [note, setNote] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [recRes, poRes] = await Promise.all([
        fetch("/api/procurement/receipts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/procurement/purchase-orders?status=submitted", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (recRes.ok) { const d = await recRes.json(); setReceipts(d.receipts ?? []); }
      if (poRes.ok) { const d = await poRes.json(); setPurchaseOrders(d.purchase_orders ?? d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const poMap = Object.fromEntries(purchaseOrders.map((p) => [p.id, p.po_number]));

  const handleCreate = async () => {
    if (!poId) return;
    setSaving(true);
    try {
      await fetch("/api/procurement/receipts", { method: "POST", headers, body: JSON.stringify({ po_id: poId, note: note.trim() || null }) });
      setShowForm(false); setPoId(""); setNote(""); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading receipts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Goods Receipts</h1>
          <p className="text-xs text-neutral-500">{receipts.length} receipt(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Receipt</button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">Record Goods Receipt</h2>
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm">
            <option value="">Select purchase order…</option>
            {purchaseOrders.map((p) => <option key={p.id} value={p.id}>{p.po_number}</option>)}
          </select>
          <textarea placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !poId} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Create Receipt"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {receipts.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">No goods receipts</p>}
        {receipts.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">Receipt for {poMap[r.po_id] ?? r.po_id}</p>
                <p className="text-xs text-neutral-500">Received {new Date(r.received_at).toLocaleString()}</p>
                {r.note && <p className="mt-1 text-xs text-neutral-400">{r.note}</p>}
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Received</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
