"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import {
  acceptConnection,
  getFriends,
  getPendingRequests,
  rejectConnection,
} from "@/src/lib/connections";

const filters = ["all", "friends", "pending"] as const;

type Filter = (typeof filters)[number];

type ContactRow = {
  connectionId: string;
  userId: string;
  fullName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  createdAt: string | null;
  type: "friend" | "pending";
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

export default function ContactsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadContacts = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      setMessage("Please sign in to view your contacts.");
      setIsLoading(false);
      return;
    }

    const [friends, pending] = await Promise.all([
      getFriends(userData.user.id),
      getPendingRequests(userData.user.id),
    ]);

    const rows: ContactRow[] = [
      ...friends.map((friend) => ({
        ...friend,
        type: "friend" as const,
      })),
      ...pending.map((request) => ({
        ...request,
        connectedAt: null,
        type: "pending" as const,
      })),
    ];

    setContacts(rows);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    if (filter === "friends" && contact.type !== "friend") {
      return false;
    }
    if (filter === "pending" && contact.type !== "pending") {
      return false;
    }
    if (!search.trim()) {
      return true;
    }
    const needle = search.toLowerCase();
    return (
      contact.fullName.toLowerCase().includes(needle) ||
      (contact.company ?? "").toLowerCase().includes(needle)
    );
  });

  const handleAccept = async (connectionId: string) => {
    const { error } = await acceptConnection(connectionId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadContacts();
  };

  const handleDecline = async (connectionId: string) => {
    const { error } = await rejectConnection(connectionId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadContacts();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading contacts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            CardLink
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Contacts & CRM
          </h2>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((tag) => {
          const active = filter === tag;
          return (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-500"
              }`}
            >
              {tag === "all" ? "All" : tag === "friends" ? "Friends" : "Pending"}
            </button>
          );
        })}
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No contacts yet.
          </div>
        ) : null}

        {filteredContacts.map((contact) => {
          const initials = getInitials(contact.fullName);
          const dateLabel = contact.type === "friend" ? "Connected" : "Requested";
          const dateValue = contact.connectedAt ?? contact.createdAt;

          return (
            <div
              key={`${contact.type}-${contact.connectionId}`}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div
                onClick={() => router.push(`/dashboard/contacts/${contact.userId}`)}
                className="flex cursor-pointer items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {contact.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[contact.title, contact.company].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
                {contact.type === "pending" ? (
                  <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <button
                      onClick={() => handleAccept(contact.connectionId)}
                      className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(contact.connectionId)}
                      className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes[contact.userId] ?? ""}
                  onChange={(event) =>
                    setNotes((prev) => ({
                      ...prev,
                      [contact.userId]: event.target.value,
                    }))
                  }
                  placeholder="Add a quick reminder about this contact"
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                />
              </div>

              <div className="text-xs text-slate-400">
                {dateValue ? `${dateLabel} ${new Date(dateValue).toLocaleDateString()}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
