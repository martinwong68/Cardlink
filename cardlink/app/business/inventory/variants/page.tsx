"use client";

import { useEffect, useState, useCallback } from "react";
import { Layers, Plus, Loader2, Tag, ChevronDown } from "lucide-react";

type Variant = {
  id: string;
  variant_name: string;
  sku: string | null;
  barcode: string | null;
  attributes: Record<string, string> | null;
  price_override: number | null;
  cost_override: number | null;
  is_active: boolean;
  created_at: string;
};

type Product = { id: string; name: string };

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function VariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCost, setFormCost] = useState("");
  const [attrPairs, setAttrPairs] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ }
  }, []);

  const loadVariants = useCallback(async () => {
    if (!selectedProduct) { setVariants([]); setLoading(false); return; }
    try {
      setError("");
      const res = await fetch(`/api/inventory/variants?product_id=${selectedProduct}`, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setVariants(d.variants ?? []); }
      else setError("Failed to load variants");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }, [selectedProduct]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setLoading(true); loadVariants(); }, [loadVariants]);

  const resetForm = () => { setShowForm(false); setFormName(""); setFormSku(""); setFormBarcode(""); setFormPrice(""); setFormCost(""); setAttrPairs([{ key: "", value: "" }]); };

  const addAttrPair = () => setAttrPairs([...attrPairs, { key: "", value: "" }]);
  const updateAttrPair = (i: number, field: "key" | "value", val: string) => {
    const next = [...attrPairs];
    next[i][field] = val;
    setAttrPairs(next);
  };
  const removeAttrPair = (i: number) => setAttrPairs(attrPairs.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!formName.trim() || !selectedProduct) return;
    setSaving(true);
    const attributes: Record<string, string> = {};
    attrPairs.forEach((p) => { if (p.key.trim() && p.value.trim()) attributes[p.key.trim()] = p.value.trim(); });
    try {
      const res = await fetch("/api/inventory/variants", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ product_id: selectedProduct, variant_name: formName.trim(), sku: formSku.trim() || null, barcode: formBarcode.trim() || null, attributes: Object.keys(attributes).length ? attributes : null, price_override: formPrice ? parseFloat(formPrice) : null, cost_override: formCost ? parseFloat(formCost) : null }),
      });
      if (res.ok) { resetForm(); await loadVariants(); } else setError("Failed to create variant");
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Product Variants</h1>
          <p className="text-xs text-gray-500">{variants.length} variants</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} disabled={!selectedProduct} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="relative">
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-100 bg-white px-3 py-2 pr-10 text-sm">
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Variant</h3>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Variant Name *" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="SKU" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formBarcode} onChange={(e) => setFormBarcode(e.target.value)} placeholder="Barcode" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="Price Override" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input type="number" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} placeholder="Cost Override" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Attributes</p>
            {attrPairs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input value={p.key} onChange={(e) => updateAttrPair(i, "key", e.target.value)} placeholder="Key" className="flex-1 rounded-lg border border-gray-100 px-3 py-1.5 text-sm" />
                <input value={p.value} onChange={(e) => updateAttrPair(i, "value", e.target.value)} placeholder="Value" className="flex-1 rounded-lg border border-gray-100 px-3 py-1.5 text-sm" />
                {attrPairs.length > 1 && <button onClick={() => removeAttrPair(i)} className="text-xs text-red-500 hover:text-red-700">✕</button>}
              </div>
            ))}
            <button onClick={addAttrPair} className="text-xs text-indigo-600 hover:text-indigo-700">+ Add attribute</button>
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !formName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
          </div>
        </div>
      )}

      {!selectedProduct ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Select a product to view variants</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No variants for this product</p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800">{v.variant_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${v.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{v.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {v.sku && <span>SKU: {v.sku}</span>}
                {v.barcode && <span>Barcode: {v.barcode}</span>}
                {v.price_override != null && <span className="font-medium text-gray-700">${Number(v.price_override).toFixed(2)}</span>}
              </div>
              {v.attributes && Object.keys(v.attributes).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(v.attributes).map(([k, val]) => (
                    <span key={k} className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      <Tag className="h-2.5 w-2.5" />{k}: {val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
