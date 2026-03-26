"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Edit2 } from "lucide-react";
import ImportFromItems from "@/components/business/ImportFromItems";

const HEADERS = { "x-cardlink-app-scope": "business" };

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  is_active: boolean;
  description: string | null;
  cost_price: number;
  sell_price: number;
  barcode: string | null;
  category_id: string | null;
  product_type: string;
  reorder_level: number;
  max_stock_level: number | null;
  image_url: string | null;
  preferred_supplier_id: string | null;
  show_in_store: boolean;
  show_in_pos: boolean;
};

type Category = { id: string; name: string };

type Variant = {
  id?: string;
  variant_name: string;
  sku: string;
  attributes: Record<string, string>;
  price_override: string;
  cost_override: string;
  is_active: boolean;
};

const emptyVariant = (): Variant => ({
  variant_name: "",
  sku: "",
  attributes: {},
  price_override: "",
  cost_override: "",
  is_active: true,
});

export default function InventoryProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* Form fields */
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellPrice, setSellPrice] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("physical");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [maxStock, setMaxStock] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showInStore, setShowInStore] = useState(false);
  const [showInPos, setShowInPos] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantAttrKey, setVariantAttrKey] = useState("Size");

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/categories", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
      if (catRes.ok) { const d = await catRes.json(); setCategories(d.categories ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName(""); setSku(""); setUnit("pcs"); setDescription("");
    setCostPrice("0"); setSellPrice("0"); setBarcode("");
    setCategoryId(""); setProductType("physical");
    setReorderLevel("5"); setMaxStock(""); setIsActive(true);
    setShowInStore(false); setShowInPos(false);
    setHasVariants(false); setVariants([]); setVariantAttrKey("Size");
    setEditId(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (p: Product) => {
    setName(p.name); setSku(p.sku); setUnit(p.unit);
    setDescription(p.description ?? ""); setCostPrice(String(p.cost_price));
    setSellPrice(String(p.sell_price)); setBarcode(p.barcode ?? "");
    setCategoryId(p.category_id ?? ""); setProductType(p.product_type);
    setReorderLevel(String(p.reorder_level)); setMaxStock(p.max_stock_level ? String(p.max_stock_level) : "");
    setIsActive(p.is_active); setShowInStore(p.show_in_store ?? false); setShowInPos(p.show_in_pos ?? false);
    setEditId(p.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !sku.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), sku: sku.trim(), unit: unit.trim() || "pcs",
        description: description.trim() || null,
        cost_price: Number(costPrice) || 0,
        sell_price: Number(sellPrice) || 0,
        barcode: barcode.trim() || null,
        category_id: categoryId || null,
        product_type: productType,
        reorder_level: Number(reorderLevel) || 5,
        max_stock_level: maxStock ? Number(maxStock) : null,
        is_active: isActive,
        show_in_store: showInStore,
        show_in_pos: showInPos,
      };

      const url = editId ? `/api/inventory/products/${editId}` : "/api/inventory/products";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) { setShowForm(false); resetForm(); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleImportFromItems = async (masterItems: { id: string; name: string; sku: string | null; description: string | null; category: string | null; unit_price: number; cost_price: number; unit: string }[]) => {
    for (const item of masterItems) {
      try {
        await fetch("/api/inventory/products", {
          method: "POST",
          headers: { ...HEADERS, "content-type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            sku: item.sku || `ITEM-${Date.now()}`,
            unit: item.unit || "pcs",
            description: item.description || null,
            cost_price: item.cost_price || 0,
            sell_price: item.unit_price || 0,
            is_active: true,
            product_type: "physical",
            reorder_level: 5,
          }),
        });
      } catch { /* continue on error */ }
    }
    await load();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading products…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Products ({products.length})</h2>
        <div className="flex items-center gap-2">
          <ImportFromItems onImport={handleImportFromItems} />
          <button onClick={openCreate} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…"
          className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">{editId ? "Edit Product" : "New Product"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name *" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU *" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <select value={productType} onChange={(e) => setProductType(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <option value="physical">Physical</option>
              <option value="service">Service</option>
              <option value="digital">Digital</option>
              <option value="consumable">Consumable</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Cost Price</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Sell Price</label>
              <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Reorder Level</label>
              <input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Max Stock Level</label>
              <input type="number" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} placeholder="Optional" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </div>
          {categories.length > 0 && (
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <button
                type="button"
                role="switch"
                aria-checked={showInStore}
                onClick={() => setShowInStore(!showInStore)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                  showInStore ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showInStore ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              Show in Store
            </label>
            <label className="flex items-center gap-2 text-sm">
              <button
                type="button"
                role="switch"
                aria-checked={showInPos}
                onClick={() => setShowInPos(!showInPos)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                  showInPos ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showInPos ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              Show in POS
            </label>
          </div>
          {/* ── Product Variants Section ── */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <button
                type="button"
                role="switch"
                aria-checked={hasVariants}
                onClick={() => {
                  const newVal = !hasVariants;
                  setHasVariants(newVal);
                  if (newVal && variants.length === 0) setVariants([emptyVariant()]);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                  hasVariants ? "bg-indigo-500" : "bg-gray-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  hasVariants ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              Enable Variants
            </label>
            {hasVariants && (
              <div className="space-y-2 pl-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Attribute name:</label>
                  <input
                    value={variantAttrKey}
                    onChange={(e) => setVariantAttrKey(e.target.value)}
                    placeholder="e.g. Size, Color"
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <input
                      value={v.variant_name}
                      onChange={(e) => setVariants((prev) => prev.map((item, i) => i === idx ? { ...item, variant_name: e.target.value } : item))}
                      placeholder="Variant name (e.g. Small)"
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                    <input
                      value={v.sku}
                      onChange={(e) => setVariants((prev) => prev.map((item, i) => i === idx ? { ...item, sku: e.target.value } : item))}
                      placeholder="SKU"
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={v.price_override}
                      onChange={(e) => setVariants((prev) => prev.map((item, i) => i === idx ? { ...item, price_override: e.target.value } : item))}
                      placeholder="Price"
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={v.cost_override}
                      onChange={(e) => setVariants((prev) => prev.map((item, i) => i === idx ? { ...item, cost_override: e.target.value } : item))}
                      placeholder="Cost"
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Product list */}
      {filtered.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No products found. Add your first product above.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-indigo-200">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{p.product_type}</span>
                  {p.show_in_store && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Store</span>}
                  {p.show_in_pos && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">POS</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.sku} · {p.unit}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                {p.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>}
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>Cost: {p.cost_price}</span>
                  <span>Sell: {p.sell_price}</span>
                  <span>Reorder: {p.reorder_level}</span>
                </div>
              </div>
              <button onClick={() => openEdit(p)} className="ml-2 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-indigo-600">
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
