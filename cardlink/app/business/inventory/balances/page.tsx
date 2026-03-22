"use client";

import { useCallback, useEffect, useState } from "react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type BalanceRow = {
  product_id: string;
  on_hand: number;
  warehouse_id: string | null;
  updated_at: string;
};

type ProductRow = { id: string; sku: string; name: string; unit: string; reorder_level: number; cost_price: number };

export default function InventoryBalancesPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [balRes, prodRes] = await Promise.all([
        fetch("/api/inventory/balances", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (balRes.ok) { const d = await balRes.json(); setBalances(d.balances ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const prodMap = new Map(products.map((p) => [p.id, p]));
  const totalValue = balances.reduce((sum, b) => {
    const p = prodMap.get(b.product_id);
    return sum + Number(b.on_hand) * Number(p?.cost_price ?? 0);
  }, 0);
  const totalItems = balances.reduce((sum, b) => sum + Number(b.on_hand), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading balances…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <h2 className="text-lg font-bold text-gray-900">Stock Balances</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-indigo-900">{balances.length}</p>
          <p className="text-[10px] text-indigo-500">Products</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-emerald-900">{totalItems}</p>
          <p className="text-[10px] text-emerald-500">Total Items</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-amber-900">{totalValue.toFixed(2)}</p>
          <p className="text-[10px] text-amber-500">Total Value</p>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <a href="/api/inventory/reports/stock-balance?format=csv"
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          download>Export CSV</a>
      </div>

      {balances.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No stock balances recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((b) => {
            const prod = prodMap.get(b.product_id);
            const isLow = prod && Number(b.on_hand) <= Number(prod.reorder_level);
            return (
              <div key={b.product_id} className={`rounded-xl border bg-white px-4 py-3 ${isLow ? "border-red-200" : "border-gray-100"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{prod?.name ?? b.product_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{prod?.sku ?? ""} · {prod?.unit ?? ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>{b.on_hand}</p>
                    {isLow && <p className="text-[10px] text-red-500">Low stock</p>}
                  </div>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  <span>Value: {(Number(b.on_hand) * Number(prod?.cost_price ?? 0)).toFixed(2)}</span>
                  <span>Updated: {new Date(b.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
