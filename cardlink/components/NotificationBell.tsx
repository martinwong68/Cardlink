"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ExternalLink,
  Send,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import {
  acceptConnection,
  rejectConnection,
} from "@/src/lib/connections";
import RelativeTime from "@/components/RelativeTime";

type NotificationBellProps = {
  userId: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type NotificationRow = {
  id: string;
  type:
    | "card_exchange_request"
    | "card_exchange_accepted"
    | "card_exchange_declined"
    | "card_viewed"
    | "system";
  title: string;
  body: string | null;
  related_user_id: string | null;
  related_card_id: string | null;
  related_connection_id: string | null;
  is_read: boolean | null;
  created_at: string;
  related_user?: ProfileRow | null;
};

type NotificationRowRaw = Omit<NotificationRow, "related_user"> & {
  related_user?: ProfileRow[] | ProfileRow | null;
};

type ViewerCard = {
  id: string;
  card_name: string | null;
  full_name: string | null;
  title: string | null;
  company: string | null;
  is_default: boolean | null;
};

type RequestModalState = {
  notificationId: string;
  connectionId: string;
  requester: ProfileRow | null;
  card: {
    id: string;
    slug: string | null;
    full_name: string | null;
    title: string | null;
    company: string | null;
    background_pattern: string | null;
    background_color: string | null;
  } | null;
  message: string | null;
};

const patternClassMap: Record<string, string> = {
  "gradient-1": "cardlink-pattern-gradient-1",
  "gradient-2": "cardlink-pattern-gradient-2",
  "gradient-3": "cardlink-pattern-gradient-3",
  "gradient-4": "cardlink-pattern-gradient-4",
  "gradient-5": "cardlink-pattern-gradient-5",
  "pattern-dots": "cardlink-pattern-dots",
  "pattern-waves": "cardlink-pattern-waves",
  "pattern-grid": "cardlink-pattern-grid",
  "pattern-circles": "cardlink-pattern-circles",
  "pattern-topography": "cardlink-pattern-topography",
};

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeSingle<T>(value: T[] | T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useTranslations("notifications");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewerCards, setViewerCards] = useState<ViewerCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [requestModal, setRequestModal] = useState<RequestModalState | null>(
    null
  );

  const pushToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, title, body, related_user_id, related_card_id, related_connection_id, is_read, created_at, related_user:profiles!related_user_id(id, full_name, avatar_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) {
      const normalized = ((data ?? []) as NotificationRowRaw[]).map(
        (item) => ({
          ...item,
          related_user: normalizeSingle(item.related_user),
        })
      );
      setNotifications(normalized);
    }
    setIsLoading(false);
  };

  const loadUnreadCount = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    setUnreadCount(count ?? 0);
  };

  const loadViewerCards = async () => {
    const { data } = await supabase
      .from("business_cards")
      .select("id, card_name, full_name, title, company, is_default")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const cards = (data ?? []) as ViewerCard[];
    setViewerCards(cards);
    const defaultCard = cards.find((card) => card.is_default);
    setSelectedCardId(defaultCard?.id ?? cards[0]?.id ?? null);
  };

  useEffect(() => {
    void loadNotifications();
    void loadUnreadCount();
    void loadViewerCards();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as NotificationRow;
          let relatedUser: ProfileRow | null = null;

          if (row.related_user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", row.related_user_id)
              .maybeSingle();
            relatedUser = profile ?? null;
          }

          setNotifications((prev) => [
            { ...row, related_user: relatedUser },
            ...prev,
          ]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    const target = notifications.find((item) => item.id === notificationId);
    if (target?.is_read) {
      return;
    }
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );
    setUnreadCount(0);
  };

  const openRequestModal = async (item: NotificationRow) => {
    if (!item.related_connection_id) {
      return;
    }

    await markAsRead(item.id);

    const { data: connection } = await supabase
      .from("connections")
      .select("id, requester_id, requester_card_id, message")
      .eq("id", item.related_connection_id)
      .maybeSingle();

    if (!connection) {
      pushToast(t("errors.loadRequest"));
      return;
    }

    const { data: requester } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", connection.requester_id)
      .maybeSingle();

    const { data: card } = connection.requester_card_id
      ? await supabase
          .from("business_cards")
          .select(
            "id, slug, full_name, title, company, background_pattern, background_color"
          )
          .eq("id", connection.requester_card_id)
          .maybeSingle()
      : { data: null };

    setRequestModal({
      notificationId: item.id,
      connectionId: connection.id,
      requester: requester ?? null,
      card: (card as RequestModalState["card"]) ?? null,
      message: connection.message ?? null,
    });
    setOpen(false);
  };

  const handleNotificationClick = async (item: NotificationRow) => {
    if (item.type === "card_exchange_request") {
      await openRequestModal(item);
      return;
    }

    await markAsRead(item.id);

    if (item.type === "card_exchange_accepted") {
      if (!item.related_card_id) {
        return;
      }

      const { data: card } = await supabase
        .from("business_cards")
        .select("slug")
        .eq("id", item.related_card_id)
        .maybeSingle();

      if (card?.slug) {
        router.push(`/c/${card.slug}`);
      }
    }
  };

  const handleAccept = async () => {
    if (!requestModal || !selectedCardId) {
      pushToast(t("errors.selectCard"));
      return;
    }

    const { error } = await acceptConnection(
      requestModal.connectionId,
      selectedCardId
    );

    if (error) {
      pushToast(error.message);
      return;
    }

    setRequestModal(null);
    pushToast(t("toast.exchanged"));
    await markAsRead(requestModal.notificationId);
    await loadNotifications();
  };

  const handleDecline = async () => {
    if (!requestModal) {
      return;
    }

    const { error } = await rejectConnection(requestModal.connectionId);
    if (error) {
      pushToast(error.message);
      return;
    }

    setRequestModal(null);
    pushToast(t("toast.declined"));
    await markAsRead(requestModal.notificationId);
    await loadNotifications();
  };

  const unreadBadge = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:text-slate-900"
        aria-label={t("labels.ariaNotifications")}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadBadge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-80 rounded-xl border border-slate-200 bg-white shadow-xl md:w-96">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {t("title")}
            </p>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-600"
            >
              {t("actions.markAllRead")}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto border-t border-slate-100">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {t("loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-slate-500">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {t("empty.title")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("empty.body")}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const profile = item.related_user;
                const name =
                  profile?.full_name ?? item.title.split(" ")[0] ?? "CL";
                const initials = getInitials(profile?.full_name ?? name);
                const isUnread = !item.is_read;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`flex w-full items-start gap-3 border-t border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      isUnread ? "bg-indigo-50" : "bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-xs font-semibold text-white">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name ?? t("labels.avatar")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          isUnread
                            ? "font-semibold text-slate-900"
                            : "text-slate-700"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.body ? (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        <RelativeTime date={item.created_at} />
                      </p>
                    </div>
                    {isUnread ? (
                      <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {requestModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {t("request.title")}
              </h3>
              <button
                type="button"
                onClick={() => setRequestModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-sm font-semibold text-white">
                {requestModal.requester?.avatar_url ? (
                  <img
                    src={requestModal.requester.avatar_url}
                    alt={requestModal.requester.full_name ?? t("labels.avatar")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(
                    requestModal.requester?.full_name ?? t("labels.cardlink")
                  )
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {requestModal.requester?.full_name ?? t("labels.member")}
                </p>
                <p className="text-xs text-slate-500">
                  {[requestModal.card?.title, requestModal.card?.company]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>

            {requestModal.message ? (
              <blockquote className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm italic text-slate-600">
                "{requestModal.message}"
              </blockquote>
            ) : null}

            {requestModal.card ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div
                  className={`cardlink-cover ${
                    patternClassMap[
                      requestModal.card.background_pattern ?? "gradient-1"
                    ] ?? patternClassMap["gradient-1"]
                  } h-20 w-full rounded-xl`}
                  style={
                    {
                      "--cardlink-base":
                        requestModal.card.background_color ?? "#6366f1",
                    } as React.CSSProperties
                  }
                />
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {requestModal.card.full_name ?? t("labels.sharedCard")}
                </p>
                <p className="text-xs text-slate-500">
                  {[requestModal.card.title, requestModal.card.company]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {requestModal.card.slug ? (
                  <a
                    href={`/c/${requestModal.card.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("actions.viewFullCard")}
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t("labels.shareBack")}
              </p>
              <div className="mt-2 space-y-2">
                {viewerCards.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {t("errors.needCard")}
                  </div>
                ) : (
                  viewerCards.map((card) => {
                    const label =
                      card.card_name || card.full_name || t("labels.myCard");
                    const subtitle = [card.title, card.company]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <label
                        key={card.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                          selectedCardId === card.id
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="share-card"
                          className="mt-1"
                          checked={selectedCardId === card.id}
                          onChange={() => setSelectedCardId(card.id)}
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {subtitle || ""}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={!selectedCardId}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                <Send className="h-4 w-4" />
                {t("actions.acceptExchange")}
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-600"
              >
                <X className="h-4 w-4" />
                {t("actions.decline")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-6 md:translate-x-0">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
