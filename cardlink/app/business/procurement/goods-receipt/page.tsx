"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck, Search, Filter, PackageCheck, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Loader2, PackageOpen, Plus,
} from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };

type ReceiptItem = { id: string; product_id: string; qty: number };
type GoodsReceipt = {
  id: string; po_id: string; receipt_number?: string; received_by: string | null;
  received_date?: string; received_at?: string; status: string;
  notes?: string | null; note?: string | null; created_at: string; items?: ReceiptItem[];
};
type PO = { id: string; po_number: string; status: string; items?: { id: string; product_id: string; qty: number; unit_cost: number }[] };
type Product = { id: string; name: string; sku: string };

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  inspected: "bg-blue-100 text-blue-700",
  accepted:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-700",
};
const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function ProcurementGoodsReceiptPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [poId, setPoId] = useState("");
  const [note, setNote] = useState("");
  const [receiveItems, setReceiveItems] = useState<{ po_item_id: string; product_id: string; qty: number }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [recRes, poRes, prodRes] = await Promise.all([
        fetch("/api/procurement/receipts", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/procurement/purchase-orders", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (recRes.ok) { const d = await recRes.json(); setReceipts(d.receipts ?? []); }
      if (poRes.ok) { const d = await poRes.json(); setPurchaseOrders(d.purchase_orders ?? d.orders ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const poMap = Object.fromEntries(purchaseOrders.map((p) => [p.id, p.po_number]));
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const receivablePOs = purchaseOrders.filter((p) => ["submitted", "ordered", "partial"].includes(p.status));

  // Stats
  const totalReceipts = receipts.length;
  const pendingCount = receipts.filter((r) => r.status === "pending").length;
  const acceptedCount = receipts.filter((r) => r.status === "accepted").length;

  // Filtering
  const filtered = receipts.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const rNum = (r.receipt_number ?? "").toLowerCase();
      const poNum = (poMap[r.po_id] ?? "").toLowerCase();
      if (!rNum.includes(q) && !poNum.includes(q)) return false;
    }
    return true;
  });

  const handlePoSelect = (id: string) => {
    setPoId(id);
    const po = purchaseOrders.find((p) => p.id === id);
    setReceiveItems(po?.items?.map((i) => ({ po_item_id: i.id, product_id: i.product_id, qty: i.qty })) ?? []);
  };

  const handleCreate = async () => {
    if (!poId || receiveItems.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/procurement/receipts", {
        method: "POST", headers: JSON_HEADERS,
        body: JSON.stringify({ po_id: poId, note: note.trim() || null, items: receiveItems.filter((i) => i.qty > 0) }),
      });
      setShowForm(false); setPoId(""); setNote(""); setReceiveItems([]); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleInspection = async (id: string, action: "accepted" | "rejected") => {
    setActing(id);
    try {
      await fetch(`/api/procurement/receipts/${id}`, {
        method: "PATCH", headers: JSON_HEADERS,
        body: JSON.stringify({ status: action }),
      });
      await load();
    } catch { /* silent */ } finally { setActing(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        <p className="text-sm text-gray-500">Loading receipts…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Goods Receipts</h1>
            <p className="text-xs text-gray-500">{totalReceipts} receipt(s)</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
          <Plus className="h-4 w-4" /> New Receipt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: totalReceipts, icon: PackageCheck, color: "text-purple-600 bg-purple-50" },
          { label: "Pending Inspection", value: pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Accepted", value: acceptedCount, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${s.color}`}><s.icon className="h-4 w-4" /></div>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by receipt# or PO#…" className="w-full rounded-xl border border-gray-100 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none rounded-xl border border-gray-100 bg-white py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="inspected">Inspected</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Record Goods Receipt</h2>
          <select value={poId} onChange={(e) => handlePoSelect(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <option value="">Select purchase order…</option>
            {receivablePOs.map((p) => <option key={p.id} value={p.id}>{p.po_number} ({p.status})</option>)}
          </select>
          {receiveItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items to Receive</p>
              {receiveItems.map((item, idx) => (
                <div key={item.po_item_id} className="flex items-center gap-3 rounded-lg border border-gray-50 bg-gray-50 px-3 py-2">
                  <p className="flex-1 text-xs text-gray-600 truncate">{productMap[item.product_id] ?? item.product_id.slice(0, 8)}</p>
                  <label className="text-[10px] text-gray-500">Qty:</label>
                  <input type="number" min="0" value={item.qty} onChange={(e) => setReceiveItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} className="w-20 rounded border border-gray-200 px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          )}
          <textarea placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !poId || receiveItems.length === 0} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
              {saving ? <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> : null}{saving ? "Saving…" : "Create Receipt"}
            </button>
            <button onClick={() => { setShowForm(false); setPoId(""); setReceiveItems([]); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Receipt List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <PackageOpen className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No receipts found</p>
            <p className="text-xs text-gray-400">{search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first goods receipt"}</p>
          </div>
        )}
        {filtered.map((r) => {
          const isExpanded = expanded === r.id;
          const poNum = poMap[r.po_id] ?? r.po_id.slice(0, 8);
          const dateStr = fmtDate(r.received_date ?? r.received_at);
          const badge = STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-700";
          const noteText = r.notes ?? r.note;
          return (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white">
              <button onClick={() => setExpanded(isExpanded ? null : r.id)} className="w-full p-4 text-left">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.receipt_number ?? `Receipt for ${poNum}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">PO: {poNum} · {dateStr}</p>
                    {r.received_by && <p className="text-xs text-gray-400">By: {r.received_by}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>{statusLabel(r.status)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
                  {noteText && <p className="text-xs text-gray-500 italic">{noteText}</p>}
                  {Array.isArray(r.items) && r.items.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Items ({r.items.length})</p>
                      {r.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                          <p className="text-xs text-gray-600 truncate">{productMap[item.product_id] ?? item.product_id.slice(0, 8)}</p>
                          <p className="text-xs font-medium text-gray-700">×{item.qty}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {(r.status === "pending" || r.status === "inspected") && (
                    <div className="flex gap-2 pt-1">
                      <button disabled={acting === r.id} onClick={() => handleInspection(r.id, "accepted")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {acting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Accept
                      </button>
                      <button disabled={acting === r.id} onClick={() => handleInspection(r.id, "rejected")} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        {acting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} Reject
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">Created {fmtDate(r.created_at)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
