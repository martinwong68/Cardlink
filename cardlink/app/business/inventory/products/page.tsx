"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Search, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

const SCOPE_HEADERS = { "x-cardlink-app-scope": "business" };

type ItemMaster = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
  image_url: string | null;
  is_active: boolean;
  product_type: string;
  images: string[];
};

/**
 * Inventory Products — now shows items from the central Item Master.
 * To edit a product, the user is redirected to Item Master.
 */
export default function InventoryProductsPage() {
  const router = useRouter();
  const { companyId, loading: companyLoading } = useActiveCompany();

  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/items", { headers: SCOPE_HEADERS });
      if (res.ok) {
        const data = await res.json();
        setItems((data.items ?? []) as ItemMaster[]);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadItems();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadItems]);

  const filtered = items.filter(
    (item) =>
      (item.product_type === "simple" || item.product_type === "variable" || item.product_type === "digital") &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  if (companyLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-2 text-sm">Loading products…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Products ({filtered.length})</h2>
        <button
          onClick={() => router.push("/business/items")}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Package className="h-4 w-4" /> Open Item Master
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        />
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700">
        Products are managed in the <strong>Item Master</strong>. Click any product to view details, or click <strong>Edit</strong> to open it in Item Master.
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No products found. Add items in the Item Master.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  {(item.images?.length > 0 || item.image_url) ? (
                    <img src={item.images?.[0] ?? item.image_url ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.sku && <span className="mr-2">{item.sku}</span>}
                    <span className="capitalize">{item.product_type}</span>
                    {item.category && <span> · {item.category}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">${item.unit_price.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500">Stock: {item.stock_quantity}</p>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === item.id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Unit Price</p>
                      <p className="text-sm font-semibold text-gray-900">${item.unit_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Cost Price</p>
                      <p className="text-sm font-semibold text-gray-900">${item.cost_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Stock</p>
                      <p className="text-sm font-semibold text-gray-900">{item.stock_quantity} {item.unit}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Reorder Level</p>
                      <p className="text-sm font-semibold text-gray-900">{item.reorder_level}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Category</p>
                      <p className="text-sm text-gray-700">{item.category || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Status</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  {item.description && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Description</p>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </div>
                  )}
                  <button
                    onClick={() => router.push("/business/items")}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit in Item Master
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
