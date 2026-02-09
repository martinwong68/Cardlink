"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  Twitter,
  User,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { rejectConnection } from "@/src/lib/connections";

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
  sort_order: number | null;
};

type CardRecord = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  card_fields: CardField[] | null;
};

type ConnectionRecord = {
  id: string;
  status: "pending" | "accepted" | "blocked";
  requester_id: string;
  receiver_id: string;
  connected_at: string | null;
  created_at: string | null;
};

const iconByType: Record<string, typeof Phone> = {
  Phone,
  Email: Mail,
  WeChat: MessageCircle,
  WhatsApp: MessageCircle,
  LinkedIn: Link2,
  "Twitter/X": Twitter,
  XHS: Link2,
  Website: Globe,
  Other: Link2,
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

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [card, setCard] = useState<CardRecord | null>(null);
  const [connection, setConnection] = useState<ConnectionRecord | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadContact = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      setMessage("Please sign in to view this contact.");
      setIsLoading(false);
      return;
    }

    setViewerId(userData.user.id);

    const [{ data: cardData, error: cardError }, { data: connectionData }] =
      await Promise.all([
        supabase
          .from("business_cards")
          .select(
            "id, user_id, full_name, title, company, bio, card_fields(id, field_type, field_label, field_value, visibility, sort_order)"
          )
          .eq("user_id", params.id)
          .eq("is_default", true)
          .order("sort_order", { foreignTable: "card_fields", ascending: true })
          .maybeSingle<CardRecord>(),
        supabase
          .from("connections")
          .select(
            "id, status, requester_id, receiver_id, connected_at, created_at"
          )
          .or(
            `and(requester_id.eq.${userData.user.id},receiver_id.eq.${params.id}),and(requester_id.eq.${params.id},receiver_id.eq.${userData.user.id})`
          )
          .maybeSingle<ConnectionRecord>(),
      ]);

    if (cardError || !cardData) {
      setMessage(cardError?.message ?? "Unable to load contact card.");
      setIsLoading(false);
      return;
    }

    setCard(cardData);
    setConnection(connectionData ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadContact();
  }, [params.id]);

  const isFriend = connection?.status === "accepted";

  const handleRemove = async () => {
    if (!connection) {
      return;
    }
    const { error } = await rejectConnection(connection.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/dashboard/contacts");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading contact...
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Contact not found.
      </div>
    );
  }

  const fullName = card.full_name ?? "CardLink User";
  const initials = getInitials(fullName);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-lg font-semibold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
            <p className="text-sm text-slate-500">
              {[card.title, card.company].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>
        {card.bio ? (
          <p className="mt-4 text-sm text-slate-600">{card.bio}</p>
        ) : null}

        <div className="mt-4 text-xs text-slate-400">
          {connection?.connected_at
            ? `Connected ${new Date(connection.connected_at).toLocaleDateString()}`
            : connection?.created_at
            ? `Requested ${new Date(connection.created_at).toLocaleDateString()}`
            : ""}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Contact fields
        </h2>
        <div className="space-y-3">
          {(card.card_fields ?? []).map((field) => {
            if (field.visibility === "hidden") {
              return null;
            }

            const isFriendsOnly = field.visibility === "friends";
            const isLocked = isFriendsOnly && !isFriend;
            const Icon = iconByType[field.field_type] ?? User;

            return (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {field.field_label || field.field_type}
                    </p>
                    <p
                      className={`text-xs text-slate-500 ${
                        isLocked ? "blur-sm select-none" : ""
                      }`}
                    >
                      {isLocked ? "Connect to see" : field.field_value}
                    </p>
                  </div>
                </div>
                {isLocked ? (
                  <span className="text-xs font-semibold text-amber-500">🔒</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bell className="h-4 w-4 text-violet-600" />
          CRM
        </div>
        <p className="mt-2 text-sm text-slate-500">
          CRM notes and follow-ups will appear here in Phase 5.
        </p>
      </div>

      <button
        onClick={handleRemove}
        disabled={!connection || connection.status === "blocked"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShieldAlert className="h-4 w-4" />
        Remove Connection
      </button>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      <button
        onClick={() => router.push("/dashboard/contacts")}
        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
      >
        Back to contacts
      </button>
    </div>
  );
}
