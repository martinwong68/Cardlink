"use client";

import { useEffect, useState, useCallback } from "react";

type Product = { id: string; name: string; sku: string | null; barcode: string | null; category: string | null; price: number; cost: number; stock: number; unit: string; is_active: boolean };

export default function PosProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/products", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(""); setSku(""); setBarcode(""); setCategory(""); setPrice("0"); setStock("0"); setEditId(null); };
  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (p: Product) => { setName(p.name); setSku(p.sku ?? ""); setBarcode(p.barcode ?? ""); setCategory(p.category ?? ""); setPrice(String(p.price)); setStock(String(p.stock)); setEditId(p.id); setShowForm(true); };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name: name.trim(), sku: sku.trim() || null, barcode: barcode.trim() || null, category: category.trim() || null, price: Number(price) || 0, stock: Number(stock) || 0, is_active: true };
    try {
      if (editId) { await fetch(`/api/pos/products/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/pos/products", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading products…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Products</h1>
        <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ Add Product</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" />

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-neutral-900">{editId ? "Edit Product" : "New Product"}</h2>
          <div className="space-y-3">
            {[["Name", name, setName], ["SKU", sku, setSku], ["Barcode", barcode, setBarcode], ["Category", category, setCategory]].map(([label, val, setter]) => (
              <div key={label as string}><label className="mb-1 block text-xs font-medium text-neutral-500">{label as string}</label><input value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">Price</label><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">Stock</label><input value={stock} onChange={(e) => setStock(e.target.value)} type="number" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-neutral-100 py-2.5 text-sm font-medium text-neutral-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !name.trim()} className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No products</p>
          <p className="text-xs text-neutral-400">Add your first POS product.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => openEdit(p)} className="w-full rounded-xl border border-neutral-100 bg-white p-4 text-left transition hover:bg-neutral-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-neutral-900">{p.name}</p>
                  <p className="text-xs text-neutral-500">{p.sku ?? "No SKU"} · {p.category ?? "Uncategorized"}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-purple-600">${Number(p.price).toFixed(2)}</p>
                  <p className={`text-xs ${p.stock <= 5 ? "font-semibold text-rose-500" : "text-neutral-500"}`}>Stock: {p.stock}</p>
                </div>
              </div>
              {!p.is_active && <p className="mt-1 text-[10px] font-semibold text-rose-400">INACTIVE</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
