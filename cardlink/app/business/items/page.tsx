"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number;
  unit: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
};

const SCOPE_HEADERS = { "x-cardlink-app-scope": "business" };

export default function ItemsPage() {
  const { loading: companyLoading } = useActiveCompany();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [taxRate, setTaxRate] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items", { headers: SCOPE_HEADERS, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!companyLoading) void loadItems(); }, [companyLoading, loadItems]);

  const resetForm = () => {
    setName("");
    setSku("");
    setDescription("");
    setCategory("");
    setUnitPrice("");
    setCostPrice("");
    setUnit("pcs");
    setTaxRate("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    setMessage(null);
    const payload = {
      name,
      sku: sku || undefined,
      description: description || undefined,
      category: category || undefined,
      unit_price: unitPrice ? Number(unitPrice) : 0,
      cost_price: costPrice ? Number(costPrice) : 0,
      unit: unit || "pcs",
      tax_rate: taxRate ? Number(taxRate) : 0,
      ...(editingId ? { id: editingId } : {}),
    };

    try {
      const res = await fetch("/api/items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...SCOPE_HEADERS },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: "success", text: editingId ? "Item updated." : "Item created." });
        resetForm();
        void loadItems();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: (d as { error?: string }).error ?? "Failed to save item." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/items?id=${id}`, {
        method: "DELETE",
        headers: SCOPE_HEADERS,
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Item deleted." });
        void loadItems();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete item." });
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setName(item.name);
    setSku(item.sku ?? "");
    setDescription(item.description ?? "");
    setCategory(item.category ?? "");
    setUnitPrice(String(item.unit_price ?? ""));
    setCostPrice(String(item.cost_price ?? ""));
    setUnit(item.unit ?? "pcs");
    setTaxRate(String(item.tax_rate ?? ""));
    setShowForm(true);
  };

  if (companyLoading || loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading items…</p></div>;
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Item Catalog</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="app-primary-btn flex items-center gap-1.5 px-3 py-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Master item catalog — items here can be imported into Store, Inventory, Accounting, and POS modules.
      </p>

      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Edit Item" : "New Item"}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name *" className="app-input px-3 py-2 text-sm" />
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="app-input px-3 py-2 text-sm" />
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="app-input px-3 py-2 text-sm" />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (pcs, kg, hr)" className="app-input px-3 py-2 text-sm" />
            <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Sell Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
            <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Cost Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
            <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax Rate (%)" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="app-input w-full px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => void handleSave()} disabled={!name.trim()} className="app-primary-btn px-4 py-2 text-sm disabled:opacity-50">
              {editingId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="app-secondary-btn px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="app-card rounded-2xl p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No items yet. Create your first item above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  {item.sku && <span className="text-[10px] font-mono text-gray-400">{item.sku}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {item.category && <span className="text-[10px] text-gray-500">{item.category}</span>}
                  <span className="text-xs text-gray-600">Sell: ${item.unit_price}</span>
                  <span className="text-xs text-gray-600">Cost: ${item.cost_price}</span>
                  <span className="text-[10px] text-gray-400">{item.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => handleEdit(item)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <Pencil className="h-3.5 w-3.5 text-gray-500" />
                </button>
                <button onClick={() => void handleDelete(item.id)} className="rounded-lg p-1.5 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
