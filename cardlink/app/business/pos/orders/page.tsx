"use client";

import { useEffect, useState, useCallback } from "react";

type Order = {
  id: string; receipt_number: string; subtotal: number; tax_amount: number; tax_rate: number;
  total: number; discount_amount: number; discount_name: string | null;
  payment_method: string; status: string; customer_name: string | null;
  cash_tendered: number | null; cash_change: number | null;
  refund_amount: number | null; refund_reason: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-sky-100 text-sky-700",
};
const STATUSES = ["all", "completed", "pending", "cancelled", "refunded"] as const;
const DEFAULT_REFUND_REASON = "Customer request";

export default function PosOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Refund modal
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  // Expandable detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/pos/orders?${params}`, { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setOrders(d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [statusFilter, startDate, endDate, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id: string) => {
    setRefunding(true);
    try {
      await fetch(`/api/pos/orders/${id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: "refunded", refund_reason: refundReason.trim() || DEFAULT_REFUND_REASON }),
      });
      setRefundOrderId(null);
      setRefundReason("");
      await load();
    } catch { /* silent */ } finally { setRefunding(false); }
  };

  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayment = async (id: string) => {
    setConfirming(true);
    try {
      await fetch(`/api/pos/orders/${id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: "completed" }),
      });
      await load();
    } catch { /* silent */ } finally { setConfirming(false); }
  };

  const toggleExpand = (orderId: string) => {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading orders…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Orders</h1>

      {/* Filters */}
      <div className="space-y-2">
        {/* Status pills */}
        <div className="flex gap-2 overflow-x-auto">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{s}</button>
          ))}
        </div>
        {/* Search & date filters */}
        <div className="flex flex-wrap gap-2">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search receipt #…" className="flex-1 min-w-[140px] rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
          <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No orders</p>
          <p className="text-xs text-gray-400">Orders will appear here after checkout.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-gray-100 bg-white p-4">
              {/* Header */}
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => toggleExpand(o.id)} className="text-sm font-bold text-gray-900 hover:text-purple-600">{o.receipt_number}</button>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>{o.status}</span>
              </div>

              {/* Customer */}
              {o.customer_name && <p className="text-xs text-gray-500 mb-1">👤 {o.customer_name}</p>}

              {/* Breakdown */}
              <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Subtotal</span><span className="text-xs text-gray-900">${Number(o.subtotal).toFixed(2)}</span></div>
              {Number(o.discount_amount) > 0 && (
                <div className="mb-1 flex justify-between"><span className="text-xs text-emerald-600">Discount{o.discount_name ? ` (${o.discount_name})` : ""}</span><span className="text-xs text-emerald-600">−${Number(o.discount_amount).toFixed(2)}</span></div>
              )}
              <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Tax ({(Number(o.tax_rate ?? 0.08) * 100).toFixed(1)}%)</span><span className="text-xs text-gray-900">${Number(o.tax_amount).toFixed(2)}</span></div>
              <div className="mb-1 flex justify-between"><span className="text-xs text-gray-500">Total</span><span className="text-sm font-bold text-gray-900">${Number(o.total).toFixed(2)}</span></div>

              {/* Refund info */}
              {o.status === "refunded" && (
                <div className="mt-1 rounded-lg bg-sky-50 px-2 py-1">
                  <p className="text-xs text-sky-700">Refunded: ${Number(o.refund_amount ?? o.total).toFixed(2)}{o.refund_reason ? ` — ${o.refund_reason}` : ""}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] capitalize text-gray-500">Payment: {o.payment_method}</span>
                  {o.cash_tendered && <span className="ml-2 text-[10px] text-gray-400">(tendered ${Number(o.cash_tendered).toFixed(2)}, change ${Number(o.cash_change ?? 0).toFixed(2)})</span>}
                </div>
                <div className="flex gap-1">
                  {o.status === "pending" && (
                    <button
                      onClick={() => void handleConfirmPayment(o.id)}
                      disabled={confirming}
                      className="rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {confirming ? "…" : "✓ Confirm Payment"}
                    </button>
                  )}
                  {o.status === "completed" && (
                    <button onClick={() => setRefundOrderId(o.id)} className="rounded bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100">Refund</button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Refund Modal */}
      {refundOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-3">Confirm Refund</h3>
            <p className="text-xs text-gray-500 mb-3">This will refund the full order amount, reverse the accounting entry, and restock inventory.</p>
            <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason for refund…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => { setRefundOrderId(null); setRefundReason(""); }} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => handleRefund(refundOrderId)} disabled={refunding} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600">{refunding ? "Processing…" : "Confirm Refund"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
