"use client";

import { useEffect, useState, useCallback } from "react";

type Order = { id: string; receipt_number: string; subtotal: number; tax_amount: number; total: number; payment_method: string; status: string; created_at: string };

const STATUS_COLORS: Record<string, string> = { completed: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", cancelled: "bg-rose-100 text-rose-700", refunded: "bg-sky-100 text-sky-700" };
const STATUSES = ["all", "completed", "pending", "cancelled", "refunded"] as const;

export default function PosOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/orders", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setOrders(d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id: string) => {
    await fetch(`/api/pos/orders/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "refunded" }) });
    await load();
  };

  const filtered = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading orders…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-neutral-900">Orders</h1>

      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No orders</p>
          <p className="text-xs text-neutral-400">Orders will appear here after checkout.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-xl border border-neutral-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-900">{o.receipt_number}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-neutral-100 text-neutral-600"}`}>{o.status}</span>
              </div>
              <div className="mb-1 flex justify-between"><span className="text-xs text-neutral-500">Subtotal</span><span className="text-xs text-neutral-900">${Number(o.subtotal).toFixed(2)}</span></div>
              <div className="mb-1 flex justify-between"><span className="text-xs text-neutral-500">Tax</span><span className="text-xs text-neutral-900">${Number(o.tax_amount).toFixed(2)}</span></div>
              <div className="mb-1 flex justify-between"><span className="text-xs text-neutral-500">Total</span><span className="text-sm font-bold text-neutral-900">${Number(o.total).toFixed(2)}</span></div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] capitalize text-neutral-500">Paid: {o.payment_method}</span>
                {o.status === "completed" && (
                  <button onClick={() => handleRefund(o.id)} className="rounded bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">Refund</button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">{new Date(o.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
