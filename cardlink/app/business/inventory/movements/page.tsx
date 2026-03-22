"use client";

import { useCallback, useEffect, useState } from "react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type Movement = {
  id: string;
  product_id: string;
  movement_type: "in" | "out" | "adjust";
  qty: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

type ProductRow = { id: string; sku: string; name: string };

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("movement_type", filterType);
      if (filterProduct) params.set("product_id", filterProduct);

      const [movRes, prodRes] = await Promise.all([
        fetch(`/api/inventory/movements?${params}`, { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (movRes.ok) { const d = await movRes.json(); setMovements(d.movements ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filterType, filterProduct]);

  useEffect(() => { load(); }, [load]);

  const prodMap = new Map(products.map((p) => [p.id, p]));

  const typeColor = (t: string) => {
    if (t === "in") return "bg-emerald-50 text-emerald-600";
    if (t === "out") return "bg-red-50 text-red-600";
    return "bg-amber-50 text-amber-600";
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading movements…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <h2 className="text-lg font-bold text-gray-900">Stock Movements ({movements.length})</h2>

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjust">Adjustment</option>
        </select>
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <a href={(() => {
          const p = new URLSearchParams({ format: "csv" });
          if (filterType) p.set("movement_type", filterType);
          if (filterProduct) p.set("product_id", filterProduct);
          return `/api/inventory/reports/movement-history?${p}`;
        })()}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          download>Export CSV</a>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No stock movements recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {movements.map((m) => {
            const prod = prodMap.get(m.product_id);
            return (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{prod?.name ?? m.product_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{prod?.sku ?? ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor(m.movement_type)}`}>
                      {m.movement_type === "in" ? "▲ IN" : m.movement_type === "out" ? "▼ OUT" : "⟳ ADJ"}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{m.qty}</span>
                  </div>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  {m.reason && <span>{m.reason}</span>}
                  {m.reference_type && <span>ref: {m.reference_type}</span>}
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
