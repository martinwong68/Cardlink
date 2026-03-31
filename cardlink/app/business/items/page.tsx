"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Pencil, Package, Search, ChevronDown, ChevronRight, RefreshCw, Copy, X, Layers, Loader2, Upload } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

/* ── Types ───────────────────────────────────────────────── */

type ProductAttribute = {
  name: string;
  options: string[];
  variation: boolean;
};

type Variation = {
  id: string;
  item_id: string;
  attributes: Record<string, string>;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  weight: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

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
  synced_to_pos: boolean;
  synced_to_store: boolean;
  synced_to_inventory: boolean;
  credit_account_id: string | null;
  debit_account_id: string | null;
  variant_attribute: string | null;
  variant_value: string | null;
  product_type: string;
  product_attributes: ProductAttribute[];
  images: string[];
  slug: string | null;
  compare_at_price: number | null;
  weight: number | null;
  max_stock_level: number | null;
};

type Account = { id: string; code: string; name: string; type: string };

const SCOPE_HEADERS = { "x-cardlink-app-scope": "business" };

const categories = ["General", "Food & Beverage", "Electronics", "Clothing", "Services", "Raw Materials", "Packaging", "Other"];
const productTypes = [
  { value: "simple", label: "Simple product" },
  { value: "variable", label: "Variable product" },
  { value: "service", label: "Service" },
  { value: "digital", label: "Digital product" },
];

const MAX_VARIATIONS = 100;

/* ── Helper: generate variation combos from attributes ──── */
function generateCombinations(attrs: ProductAttribute[]): Record<string, string>[] {
  const variationAttrs = attrs.filter((a) => a.variation && a.options.length > 0);
  if (variationAttrs.length === 0) return [];

  // Pre-check total count to avoid runaway generation
  const totalCount = variationAttrs.reduce((acc, a) => acc * a.options.length, 1);
  if (totalCount > MAX_VARIATIONS) return [];

  const combine = (index: number): Record<string, string>[] => {
    if (index >= variationAttrs.length) return [{}];
    const attr = variationAttrs[index];
    const rest = combine(index + 1);
    const result: Record<string, string>[] = [];
    for (const opt of attr.options) {
      for (const r of rest) {
        result.push({ [attr.name]: opt, ...r });
      }
    }
    return result;
  };

  return combine(0);
}

function variationLabel(attrs: Record<string, string>): string {
  return Object.values(attrs).join(" / ") || "Default";
}

/* ── Component ──────────────────────────────────────────── */

export default function ItemMasterPage() {
  const { loading: companyLoading, companyId, supabase } = useActiveCompany();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Basic form fields
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
  const [creditAccountId, setCreditAccountId] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);

  // WooCommerce-style product type & attributes
  const [productType, setProductType] = useState("simple");
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [weight, setWeight] = useState("");

  // Variations (for variable products)
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null);

  // Image upload
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  /* ── Data Loading ──────────────────────────────────────── */

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

  useEffect(() => {
    if (companyLoading) return;
    const fn = async () => {
      try {
        const res = await fetch("/api/accounting/accounts", { headers: SCOPE_HEADERS, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts ?? []);
        }
      } catch { /* silent */ }
    };
    void fn();
  }, [companyLoading]);

  const loadVariations = useCallback(async (itemId: string) => {
    setVariationsLoading(true);
    try {
      const res = await fetch(`/api/items/variations?item_id=${itemId}`, { headers: SCOPE_HEADERS, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVariations(data.variations ?? []);
      }
    } catch { /* silent */ } finally {
      setVariationsLoading(false);
    }
  }, []);

  /* ── Filtering & Stats ─────────────────────────────────── */

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

  /* ── Form Reset / Populate ─────────────────────────────── */

  const resetForm = () => {
    setName(""); setSku(""); setBarcode(""); setDescription(""); setCategory("");
    setUnitPrice(""); setCostPrice(""); setUnit("pcs"); setTaxRate("");
    setStockQuantity(""); setReorderLevel(""); setTrackInventory(true);
    setIsActive(true); setSyncPos(true); setSyncStore(true); setSyncInventory(true);
    setCreditAccountId(""); setDebitAccountId("");
    setProductType("simple"); setProductAttributes([]); setCompareAtPrice(""); setWeight("");
    setVariations([]); setExpandedVariation(null);
    setItemImages([]); setNewImageFiles([]); setUploadingImage(false);
    setEditingId(null); setShowForm(false);
  };

  /* ── CRUD ──────────────────────────────────────────────── */

  const handleSave = async () => {
    setMessage(null);

    // Upload new images to company-assets bucket
    const allImages = [...itemImages];
    if (newImageFiles.length > 0 && companyId) {
      setUploadingImage(true);
      for (const file of newImageFiles) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${companyId}/items/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("company-assets")
          .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
          allImages.push(urlData.publicUrl);
        }
      }
      setUploadingImage(false);
    }

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
      credit_account_id: creditAccountId || null,
      debit_account_id: debitAccountId || null,
      product_type: productType,
      product_attributes: productAttributes,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      weight: weight ? Number(weight) : null,
      images: allImages,
      image_url: allImages.length > 0 ? allImages[0] : null,
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
    if (!confirm("Delete this item? This will also remove all its variations.")) return;
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
    setCreditAccountId(item.credit_account_id ?? "");
    setDebitAccountId(item.debit_account_id ?? "");
    setProductType(item.product_type ?? "simple");
    setProductAttributes(item.product_attributes ?? []);
    setCompareAtPrice(item.compare_at_price != null ? String(item.compare_at_price) : "");
    setWeight(item.weight != null ? String(item.weight) : "");
    setItemImages(item.images ?? []);
    setNewImageFiles([]);
    setShowForm(true);
    if (item.product_type === "variable") {
      void loadVariations(item.id);
    }
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
    setSyncPos(true); setSyncStore(true); setSyncInventory(true);
    setProductType(item.product_type ?? "simple");
    setProductAttributes(item.product_attributes ?? []);
    setCompareAtPrice(item.compare_at_price != null ? String(item.compare_at_price) : "");
    setWeight(item.weight != null ? String(item.weight) : "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Attribute Helpers (WooCommerce-style) ─────────────── */

  const addAttribute = () => {
    setProductAttributes([...productAttributes, { name: "", options: [], variation: true }]);
  };

  const updateAttribute = (idx: number, field: keyof ProductAttribute, value: unknown) => {
    setProductAttributes((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  };

  const removeAttribute = (idx: number) => {
    setProductAttributes((prev) => prev.filter((_, i) => i !== idx));
  };

  const addOptionToAttribute = (attrIdx: number, option: string) => {
    if (!option.trim()) return;
    setProductAttributes((prev) =>
      prev.map((a, i) => {
        if (i !== attrIdx) return a;
        if (a.options.includes(option.trim())) return a;
        return { ...a, options: [...a.options, option.trim()] };
      })
    );
  };

  const removeOptionFromAttribute = (attrIdx: number, optIdx: number) => {
    setProductAttributes((prev) =>
      prev.map((a, i) =>
        i === attrIdx ? { ...a, options: a.options.filter((_, oi) => oi !== optIdx) } : a
      )
    );
  };

  /* ── Variation Helpers ─────────────────────────────────── */

  const handleGenerateVariations = async () => {
    // If item hasn't been saved yet, save it first
    let itemId = editingId;
    if (!itemId) {
      if (!name.trim()) {
        setMessage({ type: "error", text: "Please enter an item name first." });
        return;
      }
      setMessage(null);

      // Upload new images to company-assets bucket
      const allImages = [...itemImages];
      if (newImageFiles.length > 0 && companyId) {
        setUploadingImage(true);
        for (const file of newImageFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${companyId}/items/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("company-assets")
            .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
            allImages.push(urlData.publicUrl);
          }
        }
        setUploadingImage(false);
      }

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
        credit_account_id: creditAccountId || null,
        debit_account_id: debitAccountId || null,
        product_type: productType,
        product_attributes: productAttributes,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        weight: weight ? Number(weight) : null,
        images: allImages,
        image_url: allImages.length > 0 ? allImages[0] : null,
      };

      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...SCOPE_HEADERS },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setMessage({ type: "error", text: (d as { error?: string }).error ?? "Failed to save item before generating variations." });
          return;
        }
        const data = await res.json();
        const newItem = data.item as Item;
        itemId = newItem.id;
        setEditingId(newItem.id);
        setItemImages(allImages);
        setNewImageFiles([]);
        void loadItems();
      } catch {
        setMessage({ type: "error", text: "Network error while saving item." });
        return;
      }
    }

    // Check limit before generating
    const variationAttrs = productAttributes.filter((a) => a.variation && a.options.length > 0);
    const totalCount = variationAttrs.reduce((acc, a) => acc * a.options.length, 1);
    if (totalCount > MAX_VARIATIONS) {
      setMessage({ type: "error", text: `Too many combinations (${totalCount}). Maximum is ${MAX_VARIATIONS}. Reduce attribute options.` });
      return;
    }

    const combos = generateCombinations(productAttributes);
    if (combos.length === 0) return;

    // Only create combos that don't already exist
    const existingKeys = new Set(
      variations.map((v) => JSON.stringify(v.attributes))
    );
    const newCombos = combos.filter((c) => !existingKeys.has(JSON.stringify(c)));
    if (newCombos.length === 0) {
      setMessage({ type: "success", text: "All variations already exist." });
      return;
    }

    // Auto-generate SKU for each variation based on parent SKU + attribute values
    const baseSku = sku ? sku.trim() : "";
    const results = await Promise.allSettled(
      newCombos.map((combo) => {
        const variantSuffix = Object.values(combo).map((v) => v.replace(/\s+/g, "").substring(0, 10)).join("-");
        const autoSku = baseSku ? `${baseSku}-${variantSuffix}` : variantSuffix;
        return fetch("/api/items/variations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...SCOPE_HEADERS },
          body: JSON.stringify({
            item_id: itemId,
            attributes: combo,
            sku: autoSku,
            price: unitPrice ? Number(unitPrice) : null,
            cost_price: costPrice ? Number(costPrice) : null,
          }),
        });
      })
    );
    const created = results.filter((r) => r.status === "fulfilled").length;

    if (created > 0) {
      setMessage({ type: "success", text: `${created} variation${created > 1 ? "s" : ""} generated.` });
      void loadVariations(itemId);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/items/variations?id=${variationId}`, { method: "DELETE", headers: SCOPE_HEADERS });
      if (res.ok) {
        // Update local state instead of reloading
        setVariations((prev) => prev.filter((v) => v.id !== variationId));
      }
    } catch { /* silent */ }
  };

  const handleUpdateVariation = async (variation: Variation, field: string, value: unknown) => {
    // Update local state immediately to avoid reloads
    setVariations((prev) =>
      prev.map((v) => v.id === variation.id ? { ...v, [field]: value } : v)
    );
    try {
      await fetch("/api/items/variations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...SCOPE_HEADERS },
        body: JSON.stringify({ id: variation.id, [field]: value }),
      });
      // No reload — local state is already updated
    } catch { /* silent — revert not needed for inline edits */ }
  };

  const handleVariationImageUpload = async (variation: Variation, file: File) => {
    if (!companyId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${companyId}/items/var-${variation.id}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;
      void handleUpdateVariation(variation, "image_url", imageUrl);
    }
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

      {/* ── Create/Edit Form ──────────────────────────────── */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-4 border-l-4 border-indigo-400">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">{editingId ? "Edit Item" : "Create New Item"}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>

          {/* Product Type (WooCommerce-style) */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Type</h3>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} className="app-input px-3 py-2 text-sm w-full md:w-auto">
              {productTypes.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
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

          {/* Images */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Images</h3>
            <div className="flex flex-wrap gap-2">
              {itemImages.map((url, idx) => (
                <div key={url} className="relative h-20 w-20 rounded-xl overflow-hidden bg-gray-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setItemImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {newImageFiles.map((file, idx) => (
                <div key={file.name + idx} className="relative h-20 w-20 rounded-xl overflow-hidden bg-gray-100">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setNewImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition">
                <Upload className="h-5 w-5 text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    setNewImageFiles((prev) => [...prev, ...Array.from(files)]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {uploadingImage && (
              <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading images…
              </p>
            )}
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pricing &amp; Classification</h3>
            <div className="grid gap-2 md:grid-cols-4">
              <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Regular Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              <input value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="Compare-at Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Cost Price" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
              <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 md:grid-cols-4 mt-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="app-input px-3 py-2 text-sm">
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (pcs)" className="app-input px-3 py-2 text-sm" />
              <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax %" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Product Attributes (WooCommerce-style) */}
          {productType === "variable" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Attributes</h3>
                <button onClick={addAttribute} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add Attribute
                </button>
              </div>
              {productAttributes.length === 0 && (
                <p className="text-xs text-gray-400 italic">No attributes yet. Add attributes like Color, Size, or Material to create variations.</p>
              )}
              <div className="space-y-3">
                {productAttributes.map((attr, attrIdx) => (
                  <div key={attrIdx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={attr.name}
                        onChange={(e) => updateAttribute(attrIdx, "name", e.target.value)}
                        placeholder="Attribute name (e.g. Color)"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={attr.variation}
                          onChange={(e) => updateAttribute(attrIdx, "variation", e.target.checked)}
                          className="rounded"
                        />
                        Used for variations
                      </label>
                      <button onClick={() => removeAttribute(attrIdx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Options */}
                    <div className="flex flex-wrap gap-1.5">
                      {attr.options.map((opt, optIdx) => (
                        <span key={optIdx} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
                          {opt}
                          <button onClick={() => removeOptionFromAttribute(attrIdx, optIdx)} className="text-gray-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        placeholder="Add option…"
                        className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs w-28"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addOptionToAttribute(attrIdx, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variations (WooCommerce-style) */}
          {productType === "variable" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Variations ({variations.length})
                </h3>
                <button
                  onClick={() => void handleGenerateVariations()}
                  disabled={productAttributes.filter((a) => a.variation && a.options.length > 0).length === 0}
                  className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 disabled:opacity-40"
                >
                  <Layers className="h-3 w-3" /> Generate Variations
                </button>
              </div>
              {variationsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : variations.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  {productAttributes.length > 0 ? 'Click "Generate Variations" to create variation combinations.' : "Add attributes first, then generate variations."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {variations.map((v) => {
                    const isExpV = expandedVariation === v.id;
                    return (
                      <div key={v.id} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                        <div
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50/50 transition"
                          onClick={() => setExpandedVariation(isExpV ? null : v.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpV ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                            <span className="text-sm font-medium text-gray-800">{variationLabel(v.attributes)}</span>
                            {v.sku && <span className="text-[10px] font-mono text-gray-400">{v.sku}</span>}
                            {!v.is_active && <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {v.price != null && <span className="font-semibold text-gray-700">${Number(v.price).toFixed(2)}</span>}
                            <span>Qty: {v.stock_quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); void handleDeleteVariation(v.id); }} className="text-red-400 hover:text-red-600 p-0.5">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {isExpV && (
                          <div className="px-3 py-3 border-t border-gray-100 bg-gray-50/30">
                            {/* Variation Image */}
                            <div className="mb-3 flex items-center gap-3">
                              {v.image_url ? (
                                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                  <img src={v.image_url} alt="" className="h-full w-full object-cover" />
                                  <button
                                    onClick={() => void handleUpdateVariation(v, "image_url", null)}
                                    className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5"
                                  >
                                    <X className="h-2.5 w-2.5 text-white" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition shrink-0">
                                  <Upload className="h-4 w-4 text-gray-400" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) void handleVariationImageUpload(v, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                              <span className="text-[10px] text-gray-400">Variation image</span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-4">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">SKU</label>
                                <input
                                  key={`sku-${v.id}`}
                                  defaultValue={v.sku ?? ""}
                                  onBlur={(e) => void handleUpdateVariation(v, "sku", e.target.value || null)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Price</label>
                                <input
                                  key={`price-${v.id}`}
                                  type="number" step="0.01"
                                  defaultValue={v.price ?? ""}
                                  onBlur={(e) => void handleUpdateVariation(v, "price", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Cost Price</label>
                                <input
                                  key={`cost-${v.id}`}
                                  type="number" step="0.01"
                                  defaultValue={v.cost_price ?? ""}
                                  onBlur={(e) => void handleUpdateVariation(v, "cost_price", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Stock Qty</label>
                                <input
                                  key={`stock-${v.id}`}
                                  type="number"
                                  defaultValue={v.stock_quantity}
                                  onBlur={(e) => void handleUpdateVariation(v, "stock_quantity", Number(e.target.value || 0))}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-4 mt-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Barcode</label>
                                <input
                                  key={`barcode-${v.id}`}
                                  defaultValue={v.barcode ?? ""}
                                  onBlur={(e) => void handleUpdateVariation(v, "barcode", e.target.value || null)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Weight</label>
                                <input
                                  key={`weight-${v.id}`}
                                  type="number" step="0.01"
                                  defaultValue={v.weight ?? ""}
                                  onBlur={(e) => void handleUpdateVariation(v, "weight", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div className="flex items-end pb-0.5">
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={v.is_active}
                                    onChange={(e) => void handleUpdateVariation(v, "is_active", e.target.checked)}
                                    className="rounded"
                                  />
                                  Active
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          {/* Accounting */}
          {accounts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Accounting</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Credit Account (Revenue)</label>
                  <select value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} className="app-input px-3 py-2 text-sm w-full">
                    <option value="">— Select Credit Account —</option>
                    {accounts.filter((a) => a.type === "revenue" || a.type === "liability").map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Debit Account (Expense / Asset)</label>
                  <select value={debitAccountId} onChange={(e) => setDebitAccountId(e.target.value)} className="app-input px-3 py-2 text-sm w-full">
                    <option value="">— Select Debit Account —</option>
                    {accounts.filter((a) => a.type === "asset" || a.type === "expense").map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => void handleSave()} disabled={!name.trim()} className="app-primary-btn px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {editingId ? "Update Item" : "Create Item"}
            </button>
            <button onClick={resetForm} className="app-secondary-btn px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Items Table ───────────────────────────────────── */}
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
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-1 text-right">Price</div>
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
              const typeLabel = productTypes.find((pt) => pt.value === item.product_type)?.label ?? "Simple";
              const attrCount = (item.product_attributes ?? []).length;

              return (
                <div key={item.id}>
                  {/* Main Row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors text-sm">
                    <div className="col-span-3 md:col-span-3 min-w-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="flex items-center gap-1.5 text-left w-full">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                          {item.sku && <p className="text-[10px] font-mono text-gray-400 truncate">{item.sku}</p>}
                        </div>
                      </button>
                    </div>
                    <div className="col-span-1 hidden md:block">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        item.product_type === "variable" ? "bg-indigo-100 text-indigo-700" :
                        item.product_type === "service" ? "bg-amber-100 text-amber-700" :
                        item.product_type === "digital" ? "bg-cyan-100 text-cyan-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{typeLabel}</span>
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
                            <p><span className="text-gray-500">Type:</span> <span className="text-gray-800">{typeLabel}</span></p>
                            <p><span className="text-gray-500">Unit:</span> <span className="text-gray-800">{item.unit}</span></p>
                            <p><span className="text-gray-500">Tax Rate:</span> <span className="text-gray-800">{item.tax_rate}%</span></p>
                            <p><span className="text-gray-500">Barcode:</span> <span className="text-gray-800 font-mono">{item.barcode || "—"}</span></p>
                            {item.weight != null && <p><span className="text-gray-500">Weight:</span> <span className="text-gray-800">{item.weight}</span></p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pricing</h4>
                          <div className="space-y-1">
                            <p><span className="text-gray-500">Regular Price:</span> <span className="text-gray-800 font-semibold">${formatCurrency(item.unit_price)}</span></p>
                            {item.compare_at_price != null && (
                              <p><span className="text-gray-500">Compare-at:</span> <span className="text-gray-800 line-through">${formatCurrency(item.compare_at_price)}</span></p>
                            )}
                            <p><span className="text-gray-500">Cost Price:</span> <span className="text-gray-800">${formatCurrency(item.cost_price)}</span></p>
                            <p><span className="text-gray-500">Margin:</span> <span className={`font-semibold ${margin > 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span></p>
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
                      {/* Show attributes if any */}
                      {attrCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attributes</h4>
                          <div className="flex flex-wrap gap-2">
                            {item.product_attributes.map((attr, i) => (
                              <div key={i} className="text-xs">
                                <span className="text-gray-500">{attr.name}:</span>{" "}
                                <span className="text-gray-800">{attr.options.join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
