"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Loader2, Truck, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type OrderRow = {
  id: string;
  order_number: string;
  company_id: string;
  total: number;
  status: string;
  payment_status: string;
  tracking_number: string | null;
  shipping_method: string | null;
  created_at: string;
};

type CompanyRow = {
  id: string;
  name: string;
};

type DisplayOrder = OrderRow & {
  companyName: string;
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

export default function MyOrdersPanel() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("membershipOverview");

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setOrders([]);
      setMessage(t("myOrders.signInToView"));
      setIsLoading(false);
      return;
    }

    // Fetch orders linked to the user's email
    const { data: ordersRes, error: ordersError } = await supabase
      .from("store_orders")
      .select("id, order_number, company_id, total, status, payment_status, tracking_number, shipping_method, created_at")
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) {
      setMessage("Failed to load orders.");
      setIsLoading(false);
      return;
    }

    const rows = (ordersRes ?? []) as OrderRow[];

    if (rows.length === 0) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    // Fetch company names
    const companyIds = [...new Set(rows.map((r) => r.company_id))];
    const { data: companiesRes } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);

    const companyMap = new Map(
      ((companiesRes ?? []) as CompanyRow[]).map((c) => [c.id, c.name])
    );

    setOrders(
      rows.map((r) => ({
        ...r,
        companyName: companyMap.get(r.company_id) ?? "Unknown Store",
      }))
    );
    setIsLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{t("myOrders.title")}</h3>
        <button
          onClick={() => void loadData()}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ↻
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-xs text-gray-400">{t("myOrders.loading")}</span>
        </div>
      ) : message ? (
        <p className="app-card p-4 text-xs text-gray-500">{message}</p>
      ) : orders.length === 0 ? (
        <div className="app-card flex flex-col items-center py-8 text-center">
          <Package className="h-6 w-6 text-gray-300" />
          <p className="mt-2 text-xs text-gray-400">{t("myOrders.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const StatusIcon = STATUS_ICONS[order.status] ?? Clock;
            const isExpanded = expandedId === order.id;
            return (
              <button
                key={order.id}
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="app-card w-full text-left p-3 transition hover:border-indigo-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">#{order.order_number}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {t(`myOrders.statuses.${order.status}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-500">{order.companyName}</p>
                  <p className="text-xs font-bold text-gray-800">${Number(order.total).toFixed(2)}</p>
                </div>
                <p className="text-[10px] text-gray-400">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs" onClick={(e) => e.stopPropagation()}>
                    {order.shipping_method && (
                      <div>
                        <span className="text-gray-400">Carrier:</span>{" "}
                        <span className="font-medium capitalize">{order.shipping_method}</span>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div>
                        <span className="text-gray-400">{t("myOrders.trackingNumber")}:</span>{" "}
                        <span className="font-medium">{order.tracking_number}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Payment:</span>{" "}
                      <span className={`font-medium ${order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
