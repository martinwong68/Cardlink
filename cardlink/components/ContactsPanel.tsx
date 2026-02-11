"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Handshake,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import {
  acceptConnection,
  getFriends,
  getPendingRequests,
  rejectConnection,
  removeConnection,
} from "@/src/lib/connections";

type ContactRow = {
  connectionId: string;
  userId: string;
  fullName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  cardSlug: string | null;
  connectedAt: string | null;
  createdAt: string | null;
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

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export default function ContactsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useTranslations("contacts");
  const locale = useLocale();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    Array<
      ContactRow & {
        requesterCardId: string | null;
        message: string | null;
      }
    >
  >([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(true);

  const loadContacts = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      setMessage(t("errors.signIn"));
      setIsLoading(false);
      return;
    }

    const [{ data: cards }, friends, pending] = await Promise.all([
      supabase
        .from("business_cards")
        .select("id, is_default")
        .eq("user_id", userData.user.id),
      getFriends(userData.user.id),
      getPendingRequests(userData.user.id),
    ]);

    const defaultCard = (cards ?? []).find((card) => card.is_default);
    setDefaultCardId(defaultCard?.id ?? null);

    const sortedFriends = [...friends].sort((a, b) => {
      const aDate = new Date(a.connectedAt ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.connectedAt ?? b.createdAt ?? 0).getTime();
      return bDate - aDate;
    });

    setContacts(sortedFriends);
    setPendingRequests(
      pending.map((request) => ({
        ...request,
        cardSlug: null,
        connectedAt: null,
      }))
    );
    setIsLoading(false);
  };

  useEffect(() => {
    void loadContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
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
    if (!defaultCardId) {
      setMessage(t("errors.needCard"));
      return;
    }
    const { error } = await acceptConnection(connectionId, defaultCardId);
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

  const handleRemove = async (connectionId: string) => {
    const confirmed = window.confirm(t("actions.removeConfirm"));
    if (!confirmed) {
      return;
    }
    const { error } = await removeConnection(connectionId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadContacts();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            {t("brand")}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {t("title")}
          </h2>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      {pendingRequests.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setPendingOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-slate-900">
              {t("pendingTitle", { count: pendingRequests.length })}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition ${
                pendingOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {pendingOpen ? (
            <div className="mt-4 space-y-3">
              {pendingRequests.map((request) => {
                const initials = getInitials(request.fullName);
                return (
                  <div
                    key={`pending-${request.connectionId}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {request.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[request.title, request.company]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                        {request.message ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {request.message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.connectionId)}
                        className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("actions.accept")}
                      </button>
                      <button
                        onClick={() => handleDecline(request.connectionId)}
                        className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("actions.decline")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Handshake className="h-5 w-5" />
            </div>
            {t("empty.title")}
            <p className="mt-2 text-xs text-slate-400">
              {t("empty.body")}
            </p>
          </div>
        ) : null}

        {filteredContacts.map((contact) => {
          const initials = getInitials(contact.fullName);
          const dateValue = contact.connectedAt ?? contact.createdAt;

          return (
            <div
              key={`friend-${contact.connectionId}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/contacts/${contact.userId}`)
                  }
                  className="flex items-center gap-3 text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {contact.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[contact.title, contact.company]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    {dateValue ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {t("connectedOn", {
                          date: formatDate(dateValue, locale),
                        })}
                      </p>
                    ) : null}
                  </div>
                </button>
                <div className="flex flex-wrap gap-2">
                  {contact.cardSlug ? (
                    <Link
                      href={`/c/${contact.cardSlug}`}
                      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("actions.viewCard")}
                    </Link>
                  ) : null}
                  <button
                    onClick={() => handleRemove(contact.connectionId)}
                    className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("actions.remove")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
