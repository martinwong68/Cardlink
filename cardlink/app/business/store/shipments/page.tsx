"use client";

import { useEffect, useState, useCallback } from "react";
import { Truck, Plus, Search, Loader2, RefreshCw } from "lucide-react";

type Shipment = {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  shipping_cost: number | null;
  notes: string | null;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  label_created: "bg-blue-100 text-blue-700",
  picked_up: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

const STATUSES = ["all", "pending", "label_created", "picked_up", "in_transit", "out_for_delivery", "delivered", "returned", "failed"] as const;

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formOrderId, setFormOrderId] = useState("");
  const [formCarrier, setFormCarrier] = useState("");
  const [formTracking, setFormTracking] = useState("");
  const [formTrackingUrl, setFormTrackingUrl] = useState("");
  const [formEstDelivery, setFormEstDelivery] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/business/store/shipments?${params}`, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setShipments(d.shipments ?? []); }
      else setError("Failed to load shipments");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setShowForm(false); setFormOrderId(""); setFormCarrier(""); setFormTracking(""); setFormTrackingUrl(""); setFormEstDelivery(""); setFormCost(""); setFormNotes(""); };

  const handleCreate = async () => {
    if (!formOrderId.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/business/store/shipments", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ order_id: formOrderId.trim(), carrier: formCarrier.trim() || null, tracking_number: formTracking.trim() || null, tracking_url: formTrackingUrl.trim() || null, estimated_delivery: formEstDelivery || null, shipping_cost: formCost ? parseFloat(formCost) : null, notes: formNotes.trim() || null }),
      });
      if (res.ok) { resetForm(); await load(); } else setError("Failed to create shipment");
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/business/store/shipments", {
        method: "PATCH", headers: HEADERS, body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) await load(); else setError("Failed to update status");
    } catch { setError("Network error"); }
  };

  const nextStatus = (s: string): string | null => {
    const flow: Record<string, string> = { pending: "label_created", label_created: "picked_up", picked_up: "in_transit", in_transit: "out_for_delivery", out_for_delivery: "delivered" };
    return flow[s] ?? null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shipments</h1>
          <p className="text-xs text-gray-500">{shipments.length} shipments</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Shipment</h3>
          <input value={formOrderId} onChange={(e) => setFormOrderId(e.target.value)} placeholder="Order ID *" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={formCarrier} onChange={(e) => setFormCarrier(e.target.value)} placeholder="Carrier" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formTracking} onChange={(e) => setFormTracking(e.target.value)} placeholder="Tracking Number" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <input value={formTrackingUrl} onChange={(e) => setFormTrackingUrl(e.target.value)} placeholder="Tracking URL" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={formEstDelivery} onChange={(e) => setFormEstDelivery(e.target.value)} placeholder="Est. Delivery" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input type="number" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} placeholder="Shipping Cost" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !formOrderId.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : shipments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Truck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No shipments found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shipments.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Order {s.order_id.slice(0, 8)}…</p>
                  <p className="text-[10px] text-gray-500">{s.carrier ?? "—"} · {s.tracking_number ?? "No tracking"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>Shipped: {s.shipped_at ? new Date(s.shipped_at).toLocaleDateString() : "—"}</span>
                <span>Delivered: {s.delivered_at ? new Date(s.delivered_at).toLocaleDateString() : "—"}</span>
              </div>
              {nextStatus(s.status) && (
                <button onClick={() => updateStatus(s.id, nextStatus(s.status)!)} className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition">
                  <RefreshCw className="h-3 w-3" /> Mark {nextStatus(s.status)!.replace(/_/g, " ")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
