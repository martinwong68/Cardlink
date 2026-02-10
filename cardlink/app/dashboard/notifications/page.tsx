"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCircle,
  Eye,
  UserPlus,
  XCircle,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { acceptConnection, rejectConnection } from "@/src/lib/connections";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type NotificationItem = {
  id: string;
  type: "request" | "accepted" | "view" | "reminder";
  title: string;
  subtitle?: string;
  date: string;
  actorId?: string | null;
  action?: {
    acceptId?: string;
    declineId?: string;
  };
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

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      setMessage("Please sign in to view notifications.");
      setIsLoading(false);
      return;
    }

    const viewerId = userData.user.id;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();
    const todayIso = new Date().toISOString();

    const [pendingRes, acceptedRes, cardRes, sharesRes, remindersRes] =
      await Promise.all([
        supabase
          .from("connections")
          .select("id, requester_id, created_at")
          .eq("receiver_id", viewerId)
          .eq("status", "pending"),
        supabase
          .from("connections")
          .select("id, receiver_id, connected_at")
          .eq("requester_id", viewerId)
          .eq("status", "accepted")
          .gte("connected_at", weekAgoIso),
        supabase
          .from("business_cards")
          .select("id, full_name")
          .eq("user_id", viewerId),
        supabase
          .from("card_shares")
          .select("id, card_id, viewed_by_user_id, share_method, shared_at")
          .gte("shared_at", weekAgoIso),
        supabase
          .from("crm_notes")
          .select("id, contact_id, reminder_date")
          .eq("owner_id", viewerId)
          .lte("reminder_date", todayIso),
      ]);

    const pending = pendingRes.data ?? [];
    const accepted = acceptedRes.data ?? [];
    const cards = cardRes.data ?? [];
    const shares = sharesRes.data ?? [];
    const reminders = remindersRes.data ?? [];

    const cardIds = cards.map((card) => card.id);
    const myShares = shares.filter((share) => cardIds.includes(share.card_id));

    const profileIds = new Set<string>();
    pending.forEach((row) => profileIds.add(row.requester_id));
    accepted.forEach((row) => profileIds.add(row.receiver_id));
    myShares.forEach((row) => {
      if (row.viewed_by_user_id) {
        profileIds.add(row.viewed_by_user_id);
      }
    });
    reminders.forEach((row) => profileIds.add(row.contact_id));

    const { data: profiles } = profileIds.size
      ? await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(profileIds))
      : { data: [] as ProfileRow[] };

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile])
    );

    const nextNotifications: NotificationItem[] = [
      ...pending.map((row) => {
        const profile = profileMap.get(row.requester_id);
        const name = profile?.full_name ?? "Someone";
        return {
          id: `pending-${row.id}`,
          type: "request" as const,
          title: `${name} sent you a connection request`,
          date: row.created_at ?? new Date().toISOString(),
          actorId: row.requester_id,
          action: { acceptId: row.id, declineId: row.id },
        };
      }),
      ...accepted.map((row) => {
        const profile = profileMap.get(row.receiver_id);
        const name = profile?.full_name ?? "Someone";
        return {
          id: `accepted-${row.id}`,
          type: "accepted" as const,
          title: `${name} accepted your connection request`,
          date: row.connected_at ?? new Date().toISOString(),
          actorId: row.receiver_id,
        };
      }),
      ...myShares.map((row) => {
        const profile = row.viewed_by_user_id
          ? profileMap.get(row.viewed_by_user_id)
          : null;
        const name = profile?.full_name ?? "Someone";
        return {
          id: `view-${row.id}`,
          type: "view" as const,
          title: `${name} viewed your business card`,
          subtitle: row.share_method ? `via ${row.share_method}` : undefined,
          date: row.shared_at ?? new Date().toISOString(),
          actorId: row.viewed_by_user_id,
        };
      }),
      ...reminders.map((row) => {
        const profile = profileMap.get(row.contact_id);
        const name = profile?.full_name ?? "this contact";
        return {
          id: `reminder-${row.id}`,
          type: "reminder" as const,
          title: `Reminder: Follow up with ${name}`,
          date: row.reminder_date ?? new Date().toISOString(),
          actorId: row.contact_id,
        };
      }),
    ];

    nextNotifications.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setNotifications(nextNotifications);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleAccept = async (connectionId?: string) => {
    if (!connectionId) {
      return;
    }
    const { error } = await acceptConnection(connectionId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadNotifications();
  };

  const handleDecline = async (connectionId?: string) => {
    if (!connectionId) {
      return;
    }
    const { error } = await rejectConnection(connectionId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadNotifications();
  };

  const iconFor = (type: NotificationItem["type"]) => {
    switch (type) {
      case "request":
        return UserPlus;
      case "accepted":
        return CheckCircle;
      case "view":
        return Eye;
      case "reminder":
        return Bell;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Stay on top of new connections and reminders.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const Icon = iconFor(item.type);
            const initials = getInitials(item.title);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon className="h-4 w-4 text-violet-600" />
                      {item.title}
                    </div>
                    {item.subtitle ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDistanceToNow(new Date(item.date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                {item.action ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAccept(item.action?.acceptId)}
                      className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(item.action?.declineId)}
                      className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
