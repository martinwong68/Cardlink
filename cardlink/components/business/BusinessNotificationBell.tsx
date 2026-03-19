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
  is_read: boolean;
  related_module: string | null;
  created_at: string;
};

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

const MODULE_ROUTES: Record<string, string> = {
  inventory: "/business/inventory",
  pos: "/business/pos",
  accounting: "/business/accounting",
  crm: "/business/crm",
  booking: "/business/booking",
};

export default function BusinessNotificationBell({
  userId,
  companyId,
}: {
  userId: string;
  companyId: string | null;
}) {
  const t = useTranslations("businessNotifications");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<BusinessNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count + latest 5
  const fetchData = useCallback(async () => {
    if (!companyId) return;

    const [countRes, recentRes] = await Promise.all([
      supabase
        .from("business_notifications")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase
        .from("business_notifications")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setUnreadCount(countRes.count ?? 0);
    setRecent((recentRes.data as BusinessNotification[]) ?? []);
  }, [companyId, userId, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel("business-bell-realtime")
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
            setUnreadCount((prev) => prev + 1);
            setRecent((prev) => [newNotif, ...prev.slice(0, 4)]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId, supabase]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (notif: BusinessNotification) => {
    if (!notif.is_read) {
      await supabase
        .from("business_notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecent((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    setOpen(false);
    if (notif.related_module && MODULE_ROUTES[notif.related_module]) {
      router.push(MODULE_ROUTES[notif.related_module]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition"
        aria-label="Business notifications"
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-800">{t("title")}</p>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-5 w-5 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">{t("empty")}</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {recent.map((notif) => {
                const iconInfo = ICON_MAP[notif.type] ?? ICON_MAP.system;
                const Icon = iconInfo.icon;
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => void handleNotifClick(notif)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconInfo.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${iconInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs truncate ${
                          notif.is_read ? "font-normal text-gray-600" : "font-semibold text-gray-900"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <RelativeTime
                        date={notif.created_at}
                        className="text-[10px] text-gray-400"
                      />
                    </div>
                    {!notif.is_read && (
                      <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/business/notifications");
            }}
            className="w-full border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
          >
            {t("bell.viewAll")} →
          </button>
        </div>
      )}
    </div>
  );
}
