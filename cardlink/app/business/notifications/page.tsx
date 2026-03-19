"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bell,
  Bot,
  Calendar,
  DollarSign,
  FileWarning,
  Handshake,
  Info,
  ShoppingCart,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import RelativeTime from "@/components/RelativeTime";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type NotificationType =
  | "new_order"
  | "low_stock"
  | "new_connection"
  | "invoice_overdue"
  | "payment_received"
  | "booking_new"
  | "ai_suggestion"
  | "system";

type BusinessNotification = {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  priority: "urgent" | "normal" | "info";
  related_module: string | null;
  related_entity_id: string | null;
  created_at: string;
};

type FilterKey = "all" | "orders" | "stock" | "ai" | "system";

const ICON_MAP: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  new_order: { icon: ShoppingCart, color: "text-green-500", bg: "bg-green-50" },
  low_stock: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
  new_connection: { icon: Handshake, color: "text-indigo-500", bg: "bg-indigo-50" },
  invoice_overdue: { icon: FileWarning, color: "text-red-500", bg: "bg-red-50" },
  payment_received: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
  booking_new: { icon: Calendar, color: "text-teal-500", bg: "bg-teal-50" },
  ai_suggestion: { icon: Bot, color: "text-purple-500", bg: "bg-purple-50" },
  system: { icon: Info, color: "text-gray-500", bg: "bg-gray-100" },
};

const FILTER_TYPES: Record<FilterKey, NotificationType[] | null> = {
  all: null,
  orders: ["new_order", "payment_received"],
  stock: ["low_stock"],
  ai: ["ai_suggestion"],
  system: ["system"],
};

const MODULE_ROUTES: Record<string, string> = {
  inventory: "/business/inventory",
  pos: "/business/pos",
  accounting: "/business/accounting",
  crm: "/business/crm",
  booking: "/business/booking",
};

export default function BusinessNotificationsPage() {
  const t = useTranslations("businessNotifications");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!companyId || !userId) return;
    setLoading(true);

    let query = supabase
      .from("business_notifications")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const filterTypes = FILTER_TYPES[filter];
    if (filterTypes) {
      query = query.in("type", filterTypes);
    }

    const { data } = await query;
    setNotifications((data as BusinessNotification[]) ?? []);
    setLoading(false);
  }, [companyId, userId, filter, supabase]);

  useEffect(() => {
    if (companyLoading) return;
    if (!companyId || !userId) {
      setLoading(false);
      return;
    }
    void fetchNotifications();
  }, [companyLoading, companyId, userId, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || !companyId) return;

    const channel = supabase
      .channel("business-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "business_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as BusinessNotification;
          if (newNotif.company_id === companyId) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, companyId, supabase]);

  // Mark single as read
  const markAsRead = async (notif: BusinessNotification) => {
    if (!notif.is_read) {
      await supabase
        .from("business_notifications")
        .update({ is_read: true })
        .eq("id", notif.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }

    if (notif.related_module && MODULE_ROUTES[notif.related_module]) {
      router.push(MODULE_ROUTES[notif.related_module]);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    if (!companyId || !userId) return;

    await supabase
      .from("business_notifications")
      .update({ is_read: true })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const hasUnread = notifications.some((n) => !n.is_read);
  const filters: FilterKey[] = ["all", "orders", "stock", "ai", "system"];

  if (companyLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
        </div>
        <div className="app-card flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
        </div>
        {hasUnread && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="app-secondary-btn mt-2 text-xs"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <Bell className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t("empty")}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const iconInfo = ICON_MAP[notif.type] ?? ICON_MAP.system;
            const Icon = iconInfo.icon;

            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => void markAsRead(notif)}
                className="app-card w-full flex items-center gap-3 p-4 text-left transition hover:border-indigo-200 hover:-translate-y-0.5"
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconInfo.bg}`}
                >
                  <Icon className={`h-5 w-5 ${iconInfo.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate ${
                      notif.is_read ? "font-normal text-gray-700" : "font-semibold text-gray-900"
                    }`}
                  >
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{notif.body}</p>
                  )}
                  <RelativeTime
                    date={notif.created_at}
                    className="text-[10px] text-gray-400 mt-0.5"
                  />
                </div>

                {/* Unread dot */}
                {!notif.is_read && (
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
