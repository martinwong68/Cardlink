"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Twitter,
  User,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import {
  acceptConnection,
  getConnectionStatus,
  sendConnectionRequest,
  type ConnectionStatus,
} from "@/src/lib/connections";
import {
  getVisibleFields,
  type ViewerPlan,
  type ConnectionStatus as VisibilityStatus,
} from "@/src/lib/visibility";

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
  sort_order: number | null;
};

type PublicCardConnectionSectionProps = {
  ownerId: string;
  slug: string;
  viewerId: string | null;
  viewerPlan: ViewerPlan;
  cardFields: CardField[];
  vcardHref: string;
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

export default function PublicCardConnectionSection({
  ownerId,
  slug,
  viewerId,
  viewerPlan,
  cardFields,
  vcardHref,
}: PublicCardConnectionSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<ConnectionStatus | "loading">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingConnectionId, setPendingConnectionId] = useState<string | null>(null);

  const viewerIsOwner = !!viewerId && viewerId === ownerId;

  const loadStatus = async () => {
    setMessage(null);

    if (!viewerId) {
      setStatus("none");
      setPendingConnectionId(null);
      return;
    }

    if (viewerId === ownerId) {
      setStatus("accepted");
      setPendingConnectionId(null);
      return;
    }

    const nextStatus = await getConnectionStatus(viewerId, ownerId);
    setStatus(nextStatus);

    if (nextStatus === "pending_received") {
      const { data } = await supabase
        .from("connections")
        .select("id")
        .eq("requester_id", ownerId)
        .eq("receiver_id", viewerId)
        .eq("status", "pending")
        .maybeSingle();

      setPendingConnectionId(data?.id ?? null);
    } else {
      setPendingConnectionId(null);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [viewerId, ownerId]);

  const handleConnect = async () => {
    if (!viewerId) {
      return;
    }

    const { error } = await sendConnectionRequest(viewerId, ownerId);
    if (error) {
      setMessage(error.message);
      return;
    }

    setStatus("pending_sent");
  };

  const handleAccept = async () => {
    if (!pendingConnectionId) {
      return;
    }

    const { error } = await acceptConnection(pendingConnectionId);
    if (error) {
      setMessage(error.message);
      return;
    }

    setStatus("accepted");
    setPendingConnectionId(null);
  };

  const connectionStatus: VisibilityStatus = viewerIsOwner
    ? "self"
    : status === "accepted"
    ? "accepted"
    : status === "pending_received" || status === "pending_sent"
    ? "pending"
    : "none";
  const visibleFields = getVisibleFields(
    cardFields,
    viewerPlan,
    connectionStatus
  );

  return (
    <>
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Contact
        </h2>
        <div className="space-y-3">
          {visibleFields.map((field) => {
            if (!field.visible) {
              return null;
            }

            const isLocked = !!field.message;
            const Icon = iconByType[field.field_type] ?? iconByType.Other ?? User;
            const displayValue = field.message ?? field.field_value;

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
                      {displayValue}
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

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={vcardHref}
          download={`${slug || "card"}.vcf`}
          className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
        >
          Save Contact
        </a>

        {viewerIsOwner ? (
          <Link
            href="/dashboard/card/edit"
            className="flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Edit Card
          </Link>
        ) : !viewerId ? (
          <Link
            href="/signup"
            className="flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Sign up to connect
          </Link>
        ) : status === "accepted" ? (
          <div className="flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Connected ✓
          </div>
        ) : status === "pending_received" ? (
          <button
            type="button"
            onClick={handleAccept}
            className="flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Accept Connection
          </button>
        ) : status === "pending_sent" ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
            Request Sent ✓
          </div>
        ) : status === "blocked" ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
            Connection blocked
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            className="flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Connect
          </button>
        )}
      </div>
    </>
  );
}
