"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Plus, Pencil, Trash2, X, ClipboardList,
  TrendingUp, PackageCheck, PackageOpen, ChevronRight,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

type POItem = { id: string; product_id: string; qty: number; unit_cost: number };
type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  ordered_at: string | null;
  expected_at: string | null;
  notes: string | null;
  request_id: string | null;
  items: POItem[];
  created_at: string;
};
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string };

/* ── Constants ─────────────────────────────────────────── */

const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };

const STATUS_FLOW = ["draft", "submitted", "ordered", "partial", "received"] as const;
const ALL_STATUSES = [...STATUS_FLOW, "cancelled"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  ordered: "bg-indigo-100 text-indigo-700",
  partial: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const NEXT_STATUS: Record<string, string> = {
  draft: "submitted",
  submitted: "ordered",
  ordered: "partial",
  partial: "received",
};

const NEXT_LABEL: Record<string, string> = {
  draft: "Submit",
  submitted: "Mark Ordered",
  ordered: "Partial Delivery",
  partial: "Mark Received",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

const EMPTY_FORM = { supplier_id: "", expected_at: "", notes: "" };

/* ── Helpers ───────────────────────────────────────────── */

const fmtCurrency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const calcTotal = (items: POItem[]) =>
  items.reduce((sum, i) => sum + Number(i.qty) * Number(i.unit_cost), 0);

/* ── Component ─────────────────────────────────────────── */

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lineItems, setLineItems] = useState<{ product_id: string; qty: string; unit_cost: string }[]>(
    [{ product_id: "", qty: "1", unit_cost: "0" }],
  );
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Data fetching ────────────────────────────────────── */

  const load = useCallback(async () => {
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        fetch("/api/procurement/purchase-orders", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (poRes.ok) { const d = await poRes.json(); setOrders(d.purchase_orders ?? d.orders ?? []); }
      if (supRes.ok) { const d = await supRes.json(); setSuppliers(d.suppliers ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const productMap = Object.fromEntries(products.map((p) => [p.id, `${p.name} (${p.sku})`]));

  /* ── Form helpers ─────────────────────────────────────── */

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setLineItems([{ product_id: "", qty: "1", unit_cost: "0" }]);
    setEditId(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (po: PurchaseOrder) => {
    setForm({
      supplier_id: po.supplier_id,
      expected_at: po.expected_at?.slice(0, 10) ?? "",
      notes: po.notes ?? "",
    });
    setLineItems(
      Array.isArray(po.items) && po.items.length > 0
        ? po.items.map((i) => ({ product_id: i.product_id, qty: String(i.qty), unit_cost: String(i.unit_cost) }))
        : [{ product_id: "", qty: "1", unit_cost: "0" }],
    );
    setEditId(po.id);
    setShowForm(true);
  };

  const addLineItem = () =>
    setLineItems((prev) => [...prev, { product_id: "", qty: "1", unit_cost: "0" }]);

  const removeLineItem = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const updateLineItem = (idx: number, field: string, value: string) =>
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  /* ── CRUD ──────────────────────────────────────────────── */

  const handleSubmit = async () => {
    if (!form.supplier_id) return;
    const validItems = lineItems.filter((i) => i.product_id && Number(i.qty) > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    const payload = {
      po_number: editId ? undefined : `PO-${Date.now().toString(36).toUpperCase()}`,
      supplier_id: form.supplier_id,
      expected_at: form.expected_at || null,
      notes: form.notes.trim() || null,
      items: validItems.map((i) => ({
        product_id: i.product_id,
        qty: Number(i.qty),
        unit_cost: Number(i.unit_cost) || 0,
      })),
    };
    try {
      const url = editId
        ? `/api/procurement/purchase-orders/${editId}`
        : "/api/procurement/purchase-orders";
      await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      setShowForm(false);
      resetForm();
      await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const advanceStatus = async (id: string, next: string) => {
    try {
      await fetch(`/api/procurement/purchase-orders/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch { /* silent */ }
  };

  const cancelOrder = async (id: string) => {
    try {
      await fetch(`/api/procurement/purchase-orders/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "cancelled" }),
      });
      await load();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/procurement/purchase-orders/${deleteTarget.id}`, {
        method: "DELETE",
        headers: HEADERS,
      });
      setDeleteTarget(null);
      await load();
    } catch { /* silent */ } finally { setDeleting(false); }
  };

  /* ── Derived data ─────────────────────────────────────── */

  const q = search.toLowerCase();
  const filtered = orders.filter((po) => {
    const matchesSearch =
      !q ||
      po.po_number.toLowerCase().includes(q) ||
      (supplierMap[po.supplier_id] ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = orders.reduce((s, po) => s + calcTotal(po.items ?? []), 0);
  const pendingValue = orders
    .filter((po) => !["received", "cancelled"].includes(po.status))
    .reduce((s, po) => s + calcTotal(po.items ?? []), 0);
  const receivedValue = orders
    .filter((po) => po.status === "received")
    .reduce((s, po) => s + calcTotal(po.items ?? []), 0);

  /* ── Loading state ────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
        <p className="text-sm text-gray-500">Loading purchase orders…</p>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-xs text-gray-500">Track and manage supplier orders</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus size={15} /> New PO
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <ClipboardList size={18} className="text-indigo-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{orders.length}</p>
            <p className="text-[11px] text-gray-500">Total POs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <TrendingUp size={18} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{fmtCurrency(pendingValue)}</p>
            <p className="text-[11px] text-gray-500">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <PackageCheck size={18} className="text-emerald-500" />
          <div>
            <p className="text-lg font-bold text-gray-900">{fmtCurrency(receivedValue)}</p>
            <p className="text-[11px] text-gray-500">Received</p>
          </div>
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by PO number or supplier…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize focus:border-indigo-400 focus:outline-none">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Inline form (create / edit draft) */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h2>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <select value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))} className={inputClass}>
            <option value="">Select supplier *</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <input type="date" value={form.expected_at} onChange={(e) => setForm((f) => ({ ...f, expected_at: e.target.value }))} className={inputClass} />

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Line Items</p>
              <button onClick={addLineItem} className="text-xs font-semibold text-indigo-600 hover:underline">+ Add Item</button>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={item.product_id} onChange={(e) => updateLineItem(idx, "product_id", e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-2 py-1.5 text-sm">
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" min="1" placeholder="Qty" value={item.qty}
                  onChange={(e) => updateLineItem(idx, "qty", e.target.value)}
                  className="w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-sm" />
                <input type="number" min="0" step="0.01" placeholder="Cost" value={item.unit_cost}
                  onChange={(e) => updateLineItem(idx, "unit_cost", e.target.value)}
                  className="w-24 rounded-xl border border-gray-200 px-2 py-1.5 text-sm" />
                {lineItems.length > 1 && (
                  <button onClick={() => removeLineItem(idx)} className="text-xs text-red-500 hover:underline">×</button>
                )}
              </div>
            ))}
          </div>

          <textarea placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputClass} rows={2} />

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving || !form.supplier_id}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update PO" : "Create PO"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Delete <span className="font-semibold">{deleteTarget.po_number}</span>? This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting…" : "Confirm Delete"}
            </button>
            <button onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Order list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <PackageOpen size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No purchase orders found</p>
            <p className="text-xs text-gray-400">
              {orders.length === 0 ? "Create your first purchase order to get started" : "Try adjusting your search or filter"}
            </p>
          </div>
        )}

        {filtered.map((po) => {
          const total = calcTotal(po.items ?? []);
          const next = NEXT_STATUS[po.status];
          const expanded = expandedId === po.id;

          return (
            <div key={po.id} className="rounded-xl border border-gray-200 bg-white p-4">
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{po.po_number}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[po.status] ?? STATUS_COLORS.draft}`}>
                      {po.status}
                    </span>
                    {po.request_id && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">From PR</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {supplierMap[po.supplier_id] ?? "Unknown supplier"}
                    {" · "}{fmtDate(po.created_at)}
                    {po.expected_at ? ` · Expected ${fmtDate(po.expected_at)}` : ""}
                  </p>
                  {Array.isArray(po.items) && po.items.length > 0 && (
                    <p className="text-xs font-medium text-gray-700">
                      {po.items.length} item{po.items.length !== 1 ? "s" : ""} · {fmtCurrency(total)}
                    </p>
                  )}
                </div>
                <button onClick={() => setExpandedId(expanded ? null : po.id)}
                  className="ml-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <ChevronRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
              </div>

              {/* Expanded line items */}
              {expanded && Array.isArray(po.items) && po.items.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-500">
                      <span>{productMap[item.product_id] ?? item.product_id.slice(0, 8)}</span>
                      <span>{item.qty} × {fmtCurrency(Number(item.unit_cost))} = {fmtCurrency(Number(item.qty) * Number(item.unit_cost))}</span>
                    </div>
                  ))}
                  {po.notes && <p className="mt-1 text-xs italic text-gray-400">{po.notes}</p>}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                {next && (
                  <button onClick={() => advanceStatus(po.id, next)}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                    {NEXT_LABEL[po.status]} <ChevronRight size={12} />
                  </button>
                )}
                {po.status !== "cancelled" && po.status !== "received" && (
                  <button onClick={() => cancelOrder(po.id)}
                    className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200">Cancel</button>
                )}
                {po.status === "draft" && (
                  <>
                    <button onClick={() => openEdit(po)}
                      className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700" title="Edit PO">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(po)}
                      className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600" title="Delete PO">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
