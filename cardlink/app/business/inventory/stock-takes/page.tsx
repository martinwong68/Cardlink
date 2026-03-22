"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type StockTake = {
  id: string;
  reference_number: string;
  status: string;
  warehouse_id: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ProductRow = { id: string; sku: string; name: string };
type BalanceRow = { product_id: string; on_hand: number };

export default function InventoryStockTakesPage() {
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  /* Form */
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [countedQtys, setCountedQtys] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [stRes, prodRes, balRes] = await Promise.all([
        fetch("/api/inventory/stock-takes", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products?active_only=true", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/balances", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (stRes.ok) { const d = await stRes.json(); setStockTakes(d.stock_takes ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
      if (balRes.ok) { const d = await balRes.json(); setBalances(d.balances ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const balMap = new Map(balances.map((b) => [b.product_id, Number(b.on_hand)]));

  const handleCreate = async () => {
    if (!refNumber.trim() || selectedProducts.length === 0) return;
    setSaving(true);
    try {
      const items = selectedProducts.map((pid) => ({
        product_id: pid,
        counted_qty: countedQtys[pid] !== undefined && countedQtys[pid] !== "" ? Number(countedQtys[pid]) : null,
      }));
      const res = await fetch("/api/inventory/stock-takes", {
        method: "POST", headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ reference_number: refNumber.trim(), notes: notes.trim() || null, items }),
      });
      if (res.ok) { setShowForm(false); setRefNumber(""); setNotes(""); setSelectedProducts([]); setCountedQtys({}); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      const res = await fetch(`/api/inventory/stock-takes/${id}/complete`, {
        method: "POST", headers: HEADERS,
      });
      if (res.ok) await load();
    } catch { /* silent */ } finally { setCompleting(null); }
  };

  const toggleProduct = (pid: string) => {
    setSelectedProducts((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const statusColor = (s: string) => {
    if (s === "completed") return "bg-emerald-50 text-emerald-600";
    if (s === "in_progress") return "bg-blue-50 text-blue-600";
    if (s === "cancelled") return "bg-red-50 text-red-600";
    return "bg-gray-100 text-gray-500";
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading stock takes…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Stock Takes ({stockTakes.length})</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New Count
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Stock Take</h3>
          <input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Reference number (e.g. ST-001) *"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select products to count:</p>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-gray-100 p-2">
              {products.map((p) => {
                const selected = selectedProducts.includes(p.id);
                const sysQty = balMap.get(p.id) ?? 0;
                return (
                  <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${selected ? "bg-indigo-50" : ""}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleProduct(p.id)} className="rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{p.name} <span className="text-gray-400">({p.sku})</span></p>
                      <p className="text-xs text-gray-400">System qty: {sysQty}</p>
                    </div>
                    {selected && (
                      <input type="number" placeholder="Counted"
                        value={countedQtys[p.id] ?? ""}
                        onChange={(e) => setCountedQtys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating…" : "Start Count"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {stockTakes.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No stock takes yet. Start your first count above.
        </div>
      ) : (
        <div className="space-y-2">
          {stockTakes.map((st) => (
            <div key={st.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{st.reference_number}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(st.status)}`}>{st.status}</span>
                  </div>
                  {st.notes && <p className="text-xs text-gray-500 mt-0.5">{st.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(st.created_at).toLocaleDateString()}</p>
                </div>
                {(st.status === "draft" || st.status === "in_progress") && (
                  <button onClick={() => handleComplete(st.id)} disabled={completing === st.id}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {completing === st.id ? "Completing…" : "Complete"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
