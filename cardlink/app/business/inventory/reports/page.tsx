"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type LowStockRow = { product_id: string; product_name: string; sku: string; on_hand: number; reorder_level: number; deficit: number };
type ValuationRow = { product_id: string; product_name: string; sku: string; on_hand: number; cost_price: number; total_value: number };
type BalanceSummary = { total_products: number; total_items: number; total_value: number };

export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState<"balance" | "low_stock" | "valuation">("balance");
  const [loading, setLoading] = useState(true);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [valuationSummary, setValuationSummary] = useState<BalanceSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, lowRes, valRes] = await Promise.all([
        fetch("/api/inventory/reports/stock-balance", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/reports/low-stock", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/reports/valuation", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (balRes.ok) { const d = await balRes.json(); setBalanceSummary(d.summary); }
      if (lowRes.ok) { const d = await lowRes.json(); setLowStock(d.rows ?? []); }
      if (valRes.ok) { const d = await valRes.json(); setValuation(d.rows ?? []); setValuationSummary(d.summary); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: "balance" as const, label: "Stock Balance", icon: BarChart3 },
    { id: "low_stock" as const, label: "Low Stock", icon: AlertTriangle },
    { id: "valuation" as const, label: "Valuation", icon: TrendingDown },
  ];

  const exportUrl = (tab: string) => {
    if (tab === "balance") return "/api/inventory/reports/stock-balance?format=csv";
    if (tab === "low_stock") return "/api/inventory/reports/low-stock?format=csv";
    return "/api/inventory/reports/valuation?format=csv";
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading reports…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <h2 className="text-lg font-bold text-gray-900">Inventory Reports</h2>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${activeTab === t.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <a href={exportUrl(activeTab)}
          className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          download>
          <FileDown className="h-3.5 w-3.5" /> Export CSV
        </a>
      </div>

      {/* Stock Balance */}
      {activeTab === "balance" && balanceSummary && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-indigo-50 px-3 py-3 text-center">
              <p className="text-xl font-bold text-indigo-900">{balanceSummary.total_products}</p>
              <p className="text-[10px] text-indigo-500">Products</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
              <p className="text-xl font-bold text-emerald-900">{balanceSummary.total_items}</p>
              <p className="text-[10px] text-emerald-500">Total Units</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
              <p className="text-xl font-bold text-amber-900">{balanceSummary.total_value.toFixed(2)}</p>
              <p className="text-[10px] text-amber-500">Total Value</p>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock */}
      {activeTab === "low_stock" && (
        <div className="space-y-2">
          {lowStock.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-emerald-700">✓ All products are above reorder level</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                <p className="text-lg font-bold text-red-700">{lowStock.length}</p>
                <p className="text-xs text-red-500">Products below reorder level</p>
              </div>
              {lowStock.map((r) => (
                <div key={r.product_id} className="rounded-xl border border-red-100 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{r.product_name}</p>
                      <p className="text-xs text-gray-500">{r.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{r.on_hand} / {r.reorder_level}</p>
                      <p className="text-[10px] text-red-500">Need: {r.deficit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Valuation */}
      {activeTab === "valuation" && (
        <div className="space-y-2">
          {valuationSummary && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-indigo-50 px-3 py-3 text-center">
                <p className="text-xl font-bold text-indigo-900">{valuationSummary.total_products}</p>
                <p className="text-[10px] text-indigo-500">Products</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
                <p className="text-xl font-bold text-amber-900">{valuationSummary.total_value.toFixed(2)}</p>
                <p className="text-[10px] text-amber-500">Total Value</p>
              </div>
            </div>
          )}
          {valuation.map((r) => (
            <div key={r.product_id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.product_name}</p>
                  <p className="text-xs text-gray-500">{r.sku} · {r.on_hand} units @ {r.cost_price}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{Number(r.total_value).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
