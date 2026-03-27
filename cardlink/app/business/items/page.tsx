"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Pencil, Package, Search, Filter, ChevronDown, ChevronRight, BarChart3, RefreshCw, Copy, X } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number;
  unit: string;
  tax_rate: number;
  stock_quantity: number;
  reorder_level: number;
  image_url: string | null;
  is_active: boolean;
  track_inventory: boolean;
  created_at: string;
  updated_at: string | null;
  // Sync status
  synced_to_pos: boolean;
  synced_to_store: boolean;
  synced_to_inventory: boolean;
};

const SCOPE_HEADERS = { "x-cardlink-app-scope": "business" };

const categories = ["General", "Food & Beverage", "Electronics", "Clothing", "Services", "Raw Materials", "Packaging", "Other"];

export default function ItemMasterPage() {
  const { loading: companyLoading } = useActiveCompany();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [taxRate, setTaxRate] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [syncPos, setSyncPos] = useState(true);
  const [syncStore, setSyncStore] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = filterCategory === "all" || item.category === filterCategory;
      const matchActive = filterActive === "all" || (filterActive === "active" ? item.is_active : !item.is_active);
      return matchSearch && matchCategory && matchActive;
    });
  }, [items, searchQuery, filterCategory, filterActive]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.is_active).length;
    const lowStock = items.filter((i) => i.track_inventory && i.stock_quantity <= i.reorder_level && i.stock_quantity >= 0).length;
    const totalValue = items.reduce((sum, i) => sum + (i.cost_price * (i.stock_quantity || 0)), 0);
    return { total, active, lowStock, totalValue };
  }, [items]);

  const resetForm = () => {
    setName(""); setSku(""); setBarcode(""); setDescription(""); setCategory("");
    setUnitPrice(""); setCostPrice(""); setUnit("pcs"); setTaxRate("");
    setStockQuantity(""); setReorderLevel(""); setTrackInventory(true);
    setIsActive(true); setSyncPos(true); setSyncStore(true); setSyncInventory(true);
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    setMessage(null);
    const payload = {
      name,
      sku: sku || undefined,
      barcode: barcode || undefined,
      description: description || undefined,
      category: category || undefined,
      unit_price: unitPrice ? Number(unitPrice) : 0,
      cost_price: costPrice ? Number(costPrice) : 0,
      unit: unit || "pcs",
      tax_rate: taxRate ? Number(taxRate) : 0,
      stock_quantity: stockQuantity ? Number(stockQuantity) : 0,
      reorder_level: reorderLevel ? Number(reorderLevel) : 0,
      track_inventory: trackInventory,
      is_active: isActive,
      sync_to_pos: syncPos,
      sync_to_store: syncStore,
      sync_to_inventory: syncInventory,
      ...(editingId ? { id: editingId } : {}),
    };

    try {
      const res = await fetch("/api/items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...SCOPE_HEADERS },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: "success", text: editingId ? "Item updated successfully." : "Item created successfully." });
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
    if (!confirm("Delete this item? This will also remove it from POS, Store, and Inventory.")) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/items?id=${id}`, { method: "DELETE", headers: SCOPE_HEADERS });
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
    setBarcode(item.barcode ?? "");
    setDescription(item.description ?? "");
    setCategory(item.category ?? "");
    setUnitPrice(String(item.unit_price ?? ""));
    setCostPrice(String(item.cost_price ?? ""));
    setUnit(item.unit ?? "pcs");
    setTaxRate(String(item.tax_rate ?? ""));
    setStockQuantity(String(item.stock_quantity ?? ""));
    setReorderLevel(String(item.reorder_level ?? ""));
    setTrackInventory(item.track_inventory ?? true);
    setIsActive(item.is_active);
    setSyncPos(item.synced_to_pos ?? true);
    setSyncStore(item.synced_to_store ?? true);
    setSyncInventory(item.synced_to_inventory ?? true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (item: Item) => {
    setEditingId(null);
    setName(item.name + " (Copy)");
    setSku("");
    setBarcode("");
    setDescription(item.description ?? "");
    setCategory(item.category ?? "");
    setUnitPrice(String(item.unit_price ?? ""));
    setCostPrice(String(item.cost_price ?? ""));
    setUnit(item.unit ?? "pcs");
    setTaxRate(String(item.tax_rate ?? ""));
    setStockQuantity("0");
    setReorderLevel(String(item.reorder_level ?? ""));
    setTrackInventory(item.track_inventory ?? true);
    setIsActive(true);
    setSyncPos(true);
    setSyncStore(true);
    setSyncInventory(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatCurrency = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (companyLoading || loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading Item Master…</p></div>;
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Item Master</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Central product hub — all changes sync to POS, Store, Inventory &amp; Accounting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadItems()} className="app-secondary-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="app-primary-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
            <Plus className="h-4 w-4" /> New Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="app-card rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Items</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="app-card rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active</p>
          <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="app-card rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Low Stock</p>
          <p className="text-xl font-bold text-amber-600">{stats.lowStock}</p>
        </div>
        <div className="app-card rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Inventory Value</p>
          <p className="text-xl font-bold text-indigo-600">${formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="app-input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="app-input px-3 py-2 text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="app-input px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {message && (
        <div className={`px-3 py-2 text-sm rounded-lg ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-4 border-l-4 border-indigo-400">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">{editingId ? "Edit Item" : "Create New Item"}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Basic Information</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name *" className="app-input px-3 py-2 text-sm" />
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="app-input px-3 py-2 text-sm" />
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode / EAN" className="app-input px-3 py-2 text-sm" />
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="app-input w-full px-3 py-2 text-sm resize-none mt-2" />
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pricing &amp; Classification</h3>
            <div className="grid gap-2 md:grid-cols-4">
              <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Sell Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Cost Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="app-input px-3 py-2 text-sm">
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="app-input px-3 py-2 text-sm" />
                <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax %" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inventory</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <input value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Opening Stock" type="number" className="app-input px-3 py-2 text-sm" />
              <input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="Reorder Level" type="number" className="app-input px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 px-3 py-2">
                <input type="checkbox" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Track Inventory</span>
              </label>
            </div>
          </div>

          {/* Module Sync */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Module Sync</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={syncPos} onChange={(e) => setSyncPos(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">POS</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={syncStore} onChange={(e) => setSyncStore(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Online Store</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={syncInventory} onChange={(e) => setSyncInventory(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Inventory</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => void handleSave()} disabled={!name.trim()} className="app-primary-btn px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {editingId ? "Update Item" : "Create Item"}
            </button>
            <button onClick={resetForm} className="app-secondary-btn px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="app-card rounded-2xl p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">{items.length === 0 ? "No items yet. Create your first item above." : "No items match your filters."}</p>
        </div>
      ) : (
        <div className="app-card rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Item</div>
            <div className="col-span-1">SKU</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-1 text-right">Sell</div>
            <div className="col-span-1 text-right">Cost</div>
            <div className="col-span-1 text-right">Stock</div>
            <div className="col-span-2 text-center">Synced To</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const margin = item.unit_price > 0 ? ((item.unit_price - item.cost_price) / item.unit_price * 100) : 0;
              const isLowStock = item.track_inventory && item.stock_quantity <= item.reorder_level;

              return (
                <div key={item.id}>
                  {/* Main Row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors text-sm">
                    <div className="col-span-3 md:col-span-3 min-w-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="flex items-center gap-1.5 text-left w-full">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                          {item.barcode && <p className="text-[10px] font-mono text-gray-400 truncate">{item.barcode}</p>}
                        </div>
                      </button>
                    </div>
                    <div className="col-span-1 hidden md:block">
                      <span className="text-xs font-mono text-gray-500">{item.sku || "—"}</span>
                    </div>
                    <div className="col-span-1 hidden md:block">
                      <span className="text-xs text-gray-500">{item.category || "—"}</span>
                    </div>
                    <div className="col-span-1 hidden md:block text-right">
                      <span className="font-semibold text-gray-800">${formatCurrency(item.unit_price)}</span>
                    </div>
                    <div className="col-span-1 hidden md:block text-right">
                      <span className="text-gray-600">${formatCurrency(item.cost_price)}</span>
                    </div>
                    <div className="col-span-1 hidden md:block text-right">
                      <span className={`font-semibold ${isLowStock ? "text-amber-600" : "text-gray-800"}`}>
                        {item.track_inventory ? item.stock_quantity : "N/A"}
                      </span>
                    </div>
                    <div className="col-span-2 hidden md:flex justify-center gap-1">
                      {item.synced_to_pos && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">POS</span>}
                      {item.synced_to_store && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Store</span>}
                      {item.synced_to_inventory && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">Inv</span>}
                      {!item.is_active && <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">Inactive</span>}
                    </div>
                    <div className="col-span-9 md:col-span-2 flex justify-end gap-1">
                      <button onClick={() => handleEdit(item)} className="rounded-lg p-1.5 hover:bg-indigo-50" title="Edit">
                        <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                      </button>
                      <button onClick={() => handleDuplicate(item)} className="rounded-lg p-1.5 hover:bg-gray-100" title="Duplicate">
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => void handleDelete(item.id)} className="rounded-lg p-1.5 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-100">
                      <div className="grid md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Details</h4>
                          <p className="text-gray-700">{item.description || "No description"}</p>
                          <div className="mt-2 space-y-1">
                            <p><span className="text-gray-500">Unit:</span> <span className="text-gray-800">{item.unit}</span></p>
                            <p><span className="text-gray-500">Tax Rate:</span> <span className="text-gray-800">{item.tax_rate}%</span></p>
                            <p><span className="text-gray-500">Barcode:</span> <span className="text-gray-800 font-mono">{item.barcode || "—"}</span></p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pricing</h4>
                          <div className="space-y-1">
                            <p><span className="text-gray-500">Sell Price:</span> <span className="text-gray-800 font-semibold">${formatCurrency(item.unit_price)}</span></p>
                            <p><span className="text-gray-500">Cost Price:</span> <span className="text-gray-800">${formatCurrency(item.cost_price)}</span></p>
                            <p><span className="text-gray-500">Margin:</span> <span className={`font-semibold ${margin > 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span></p>
                            <p><span className="text-gray-500">Profit/Unit:</span> <span className="text-gray-800">${formatCurrency(item.unit_price - item.cost_price)}</span></p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Inventory</h4>
                          <div className="space-y-1">
                            <p><span className="text-gray-500">In Stock:</span> <span className={`font-semibold ${isLowStock ? "text-amber-600" : "text-gray-800"}`}>{item.track_inventory ? item.stock_quantity : "Not tracked"}</span></p>
                            <p><span className="text-gray-500">Reorder Level:</span> <span className="text-gray-800">{item.reorder_level}</span></p>
                            <p><span className="text-gray-500">Stock Value:</span> <span className="text-gray-800">${formatCurrency(item.cost_price * (item.stock_quantity || 0))}</span></p>
                            {isLowStock && <p className="text-amber-600 font-semibold mt-1">⚠ Below reorder level</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
            <span>Showing {filteredItems.length} of {items.length} items</span>
            <span>Total Inventory Value: ${formatCurrency(stats.totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
