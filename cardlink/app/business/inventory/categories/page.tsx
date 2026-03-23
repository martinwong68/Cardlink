"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Edit3, FolderTree, Plus, Search, Trash2, X } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };
const WRITE_HEADERS = { ...HEADERS, "content-type": "application/json" };

type Category = { id: string; name: string; description?: string | null; parent_id: string | null; sort_order: number };
type Product = { id: string; category_id?: string | null };

export default function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/inventory/categories", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (catRes.ok) { const d = await catRes.json(); setCategories(d.categories ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Product count per category */
  const productCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.category_id) map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  /* Build tree with depth */
  const flatTree = useMemo(() => {
    const byParent = new Map<string, Category[]>();
    for (const c of categories) {
      const key = c.parent_id ?? "__root__";
      byParent.set(key, [...(byParent.get(key) ?? []), c]);
    }
    for (const [k, list] of byParent) {
      byParent.set(k, list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    }
    const result: { cat: Category; depth: number }[] = [];
    const walk = (pid: string | null, depth: number) => {
      const key = pid ?? "__root__";
      for (const child of byParent.get(key) ?? []) {
        result.push({ cat: child, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }, [categories]);

  /* Filtered tree */
  const filtered = useMemo(() => {
    if (!search.trim()) return flatTree;
    const q = search.toLowerCase();
    return flatTree.filter(({ cat }) => cat.name.toLowerCase().includes(q) || (cat.description ?? "").toLowerCase().includes(q));
  }, [flatTree, search]);

  /* Create */
  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST", headers: WRITE_HEADERS,
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, parent_id: parentId || null }),
      });
      if (res.ok) { setShowForm(false); setName(""); setDescription(""); setParentId(""); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  /* Edit inline */
  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); setEditDesc(cat.description ?? ""); };
  const saveEdit = async (catId: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST", headers: WRITE_HEADERS,
        body: JSON.stringify({ id: catId, name: editName.trim(), description: editDesc.trim() || null }),
      });
      if (res.ok) { setEditingId(null); await load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  /* Delete */
  const handleDelete = async (cat: Category) => {
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/inventory/categories?id=${cat.id}`, { method: "DELETE", headers: HEADERS });
      if (res.ok) await load();
    } catch { /* silent */ } finally { setDeletingId(null); }
  };

  /* Move up/down */
  const moveCat = async (cat: Category, dir: -1 | 1) => {
    const siblings = categories.filter((c) => (c.parent_id ?? null) === (cat.parent_id ?? null))
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((s) => s.id === cat.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    setSaving(true);
    try {
      const a = siblings[idx], b = siblings[swapIdx];
      await Promise.all([
        fetch("/api/inventory/categories", { method: "POST", headers: WRITE_HEADERS, body: JSON.stringify({ id: a.id, name: a.name, sort_order: b.sort_order, parent_id: a.parent_id }) }),
        fetch("/api/inventory/categories", { method: "POST", headers: WRITE_HEADERS, body: JSON.stringify({ id: b.id, name: b.name, sort_order: a.sort_order, parent_id: b.parent_id }) }),
      ]);
      await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      <p className="mt-2 text-sm">Loading categories…</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Categories ({categories.length})</h2>
        <button onClick={() => { setName(""); setDescription(""); setParentId(""); setShowForm(!showForm); }}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="flex-1 bg-transparent text-sm outline-none" />
        {search && <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">New Category</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name *" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          {categories.length > 0 && (
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <option value="">No parent (top-level)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Category list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <FolderTree className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No categories found</p>
          <p className="text-xs text-gray-400 mt-1">Create your first category or adjust the search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ cat, depth }) => {
            const count = productCount.get(cat.id) ?? 0;
            const isEditing = editingId === cat.id;
            const parent = categories.find((p) => p.id === cat.parent_id);
            return (
              <div key={cat.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3"
                style={{ paddingLeft: `${16 + depth * 24}px` }}>
                {isEditing ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm" autoFocus />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-sm" />
                    <button onClick={() => saveEdit(cat.id)} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:bg-gray-50 rounded"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
                        {depth > 0 && parent && <span className="text-[10px] text-gray-400">← {parent.name}</span>}
                      </div>
                      {cat.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</p>}
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{count} products</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${depth === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {depth === 0 ? "Root" : `Level ${depth}`}
                    </span>
                    <button onClick={() => moveCat(cat, -1)} disabled={saving} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveCat(cat, 1)} disabled={saving} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => startEdit(cat)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Edit3 className="h-3.5 w-3.5" /></button>
                    {deletingId === cat.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(cat)} className="text-[10px] text-red-600 px-2 py-1 hover:bg-red-50 rounded">Delete</button>
                        <button onClick={() => setDeletingId(null)} className="text-[10px] text-gray-500 px-2 py-1 hover:bg-gray-50 rounded">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(cat.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
