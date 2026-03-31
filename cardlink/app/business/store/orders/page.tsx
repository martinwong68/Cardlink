"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  status: string;
  payment_method: string | null;
  payment_status: string;
  shipping_method: string | null;
  tracking_number: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-rose-100 text-rose-700",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  refunded: RefreshCw,
};

const STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "refunded"] as const;
const HEADERS = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function StoreOrdersPage() {
  const t = useTranslations("businessStore.orders");
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail & actions
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  // Refund modal
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  // Ship modal (tracking & shipping provider)
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [shipTracking, setShipTracking] = useState("");
  const [shipProvider, setShipProvider] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/business/store/orders?${params}`, { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setOrders(d.orders ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [statusFilter, startDate, endDate, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, newStatus: string, extra?: Record<string, unknown>) => {
    setUpdating(true);
    try {
      await fetch(`/api/business/store/orders/${orderId}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      setSelectedOrder(null);
      setRefundOrderId(null);
      setRefundReason("");
      setShipOrderId(null);
      setShipTracking("");
      setShipProvider("");
      await load();
    } catch { /* silent */ } finally { setUpdating(false); }
  };

  const handleRefund = async (orderId: string) => {
    await updateStatus(orderId, "refunded", { refund_reason: refundReason.trim() || "Customer request" });
  };

  const handleConfirmPayment = async (orderId: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/business/store/orders/${orderId}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ payment_status: "paid", paid_at: new Date().toISOString() }),
      });
      setSelectedOrder(null);
      await load();
    } catch { /* silent */ } finally { setUpdating(false); }
  };

  const handleShipOrder = async (orderId: string) => {
    const extra: Record<string, unknown> = {};
    if (shipTracking.trim()) extra.tracking_number = shipTracking.trim();
    if (shipProvider.trim()) extra.shipping_method = shipProvider.trim();
    await updateStatus(orderId, "shipped", extra);
  };

  const buildWhatsAppLink = (order: Order) => {
    const phone = (order.customer_phone ?? "").replace(/[^0-9]/g, "");
    if (!phone) return null;
    const msg = `Hi ${order.customer_name || "there"}! Your order #${order.order_number} ($${Number(order.total).toFixed(2)}) has been confirmed. ` +
      (order.tracking_number ? `Tracking: ${order.tracking_number}. ` : "") +
      `Thank you for your purchase! 🎉\n\nManage all your memberships and orders easily with Cardlink — https://cardlink.app`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const getNextStatus = (status: string): string | null => {
    const flow: Record<string, string> = {
      pending: "confirmed",
      confirmed: "processing",
      processing: "shipped",
      shipped: "delivered",
      delivered: "completed",
    };
    return flow[status] ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/business/store-management")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="app-input w-full pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(`statuses.${s}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="app-input text-xs" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="app-input text-xs" />
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-4">
          <Package className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const StatusIcon = STATUS_ICONS[order.status] ?? Clock;
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                className="app-card w-full text-left p-4 transition hover:border-indigo-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">{order.order_number}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    <StatusIcon className="h-3 w-3" />
                    {t(`statuses.${order.status}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{order.customer_name || order.customer_email || t("guest")}</p>
                    <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">${Number(order.total).toFixed(2)}</p>
                    <p className={`text-[10px] font-medium ${order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                      {t(`paymentStatus.${order.payment_status}`)}
                    </p>
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedOrder?.id === order.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">{t("subtotal")}:</span> <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span></div>
                      {Number(order.discount_amount) > 0 && <div><span className="text-gray-400">{t("discount")}:</span> <span className="font-medium text-green-600">-${Number(order.discount_amount).toFixed(2)}</span></div>}
                      {Number(order.tax_amount) > 0 && <div><span className="text-gray-400">{t("tax")}:</span> <span className="font-medium">${Number(order.tax_amount).toFixed(2)}</span></div>}
                      {Number(order.shipping_amount) > 0 && <div><span className="text-gray-400">{t("shipping")}:</span> <span className="font-medium">${Number(order.shipping_amount).toFixed(2)}</span></div>}
                      {order.payment_method && <div><span className="text-gray-400">{t("paymentMethod")}:</span> <span className="font-medium capitalize">{order.payment_method}</span></div>}
                      {order.shipping_method && <div><span className="text-gray-400">{t("shippingMethod")}:</span> <span className="font-medium capitalize">{order.shipping_method}</span></div>}
                      {order.tracking_number && <div className="col-span-2"><span className="text-gray-400">{t("tracking")}:</span> <span className="font-medium">{order.tracking_number}</span></div>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Confirm Payment button for unpaid/pending orders (QR / bank transfer) */}
                      {(order.payment_status === "unpaid" || order.payment_status === "pending") && !["cancelled", "refunded"].includes(order.status) && (
                        <button
                          onClick={() => handleConfirmPayment(order.id)}
                          disabled={updating}
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {updating ? "..." : "✓ Confirm Payment"}
                        </button>
                      )}
                      {getNextStatus(order.status) && (
                        getNextStatus(order.status) === "shipped" ? (
                          <button
                            onClick={() => { setShipOrderId(order.id); setShipTracking(order.tracking_number ?? ""); setShipProvider(order.shipping_method ?? ""); }}
                            disabled={updating}
                            className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {t("actions.shipped")}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(order.id, getNextStatus(order.status)!)}
                            disabled={updating}
                            className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {updating ? "..." : t(`actions.${getNextStatus(order.status)}`)}
                          </button>
                        )
                      )}
                      {!["cancelled", "refunded", "completed"].includes(order.status) && (
                        <button
                          onClick={() => updateStatus(order.id, "cancelled")}
                          disabled={updating}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition"
                        >
                          {t("actions.cancel")}
                        </button>
                      )}
                      {["completed", "delivered"].includes(order.status) && order.payment_status !== "refunded" && (
                        <button
                          onClick={() => setRefundOrderId(order.id)}
                          className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100 transition"
                        >
                          {t("actions.refund")}
                        </button>
                      )}
                    </div>

                    {/* WhatsApp reminder — send confirmation to customer */}
                    {order.payment_status === "paid" && order.customer_phone && (
                      <div className="pt-2 border-t border-gray-100">
                        <a
                          href={buildWhatsAppLink(order) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {t("sendWhatsApp")}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Refund Modal */}
      {refundOrderId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setRefundOrderId(null)}>
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">{t("refundTitle")}</h3>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder={t("refundReasonPlaceholder")}
              rows={3}
              className="app-input w-full resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setRefundOrderId(null)} className="flex-1 rounded-lg bg-gray-100 py-2.5 text-xs font-medium text-gray-600">
                {t("cancel")}
              </button>
              <button
                onClick={() => handleRefund(refundOrderId)}
                disabled={updating}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {updating ? "..." : t("confirmRefund")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal — enter tracking number & shipping provider */}
      {shipOrderId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShipOrderId(null)}>
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">{t("shipTitle")}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("shippingProvider")}</label>
              <input
                type="text"
                value={shipProvider}
                onChange={(e) => setShipProvider(e.target.value)}
                placeholder={t("shippingProviderPlaceholder")}
                className="app-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("trackingNumber")}</label>
              <input
                type="text"
                value={shipTracking}
                onChange={(e) => setShipTracking(e.target.value)}
                placeholder={t("trackingNumberPlaceholder")}
                className="app-input w-full"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShipOrderId(null)} className="flex-1 rounded-lg bg-gray-100 py-2.5 text-xs font-medium text-gray-600">
                {t("cancel")}
              </button>
              <button
                onClick={() => handleShipOrder(shipOrderId)}
                disabled={updating}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating ? "..." : t("confirmShip")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
