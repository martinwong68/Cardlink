"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CreditCard, Nfc, PencilLine, Power, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

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

type LinkedCard = {
  id: string;
  card_name: string | null;
  full_name: string | null;
  title: string | null;
  background_pattern: string | null;
  background_color: string | null;
};

type NfcCard = {
  id: string;
  nfc_uid: string | null;
  status: "active" | "suspended" | "deactivated" | "lost" | "unregistered";
  linked_card_id: string | null;
  total_taps: number | null;
  last_tapped_at: string | null;
  linked_card: LinkedCard | null;
};

type BusinessCard = LinkedCard & { is_default: boolean | null };

type TapSeriesPoint = { name: string; taps: number };

const formatUid = (uid: string | null) => {
  if (!uid) {
    return "NFC_XXXXXX";
  }
  return `NFC_${uid.slice(-6).toUpperCase()}`;
};

const formatDate = (value: string | null, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const buildTapSeries = (timestamps: string[], locale: string) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString(locale, { weekday: "short" });
    return { key, label };
  });

  const counts = new Map<string, number>();
  timestamps.forEach((value) => {
    const key = value.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return days.map((day) => ({
    name: day.label,
    taps: counts.get(day.key) ?? 0,
  }));
};

export default function NfcCardsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("nfc");
  const locale = useLocale();
  const [nfcCards, setNfcCards] = useState<NfcCard[]>([]);
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [tapSeries, setTapSeries] = useState<TapSeriesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<NfcCard | null>(null);
  const [selectedLinkedCardId, setSelectedLinkedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signIn"));
      setIsLoading(false);
      return;
    }

    const userId = userData.user.id;

    const [nfcRes, cardsRes] = await Promise.all([
      supabase
        .from("nfc_cards")
        .select(
          "id, nfc_uid, status, linked_card_id, total_taps, last_tapped_at, linked_card:business_cards(id, card_name, full_name, title, background_pattern, background_color)"
        )
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("business_cards")
        .select(
          "id, card_name, full_name, title, background_pattern, background_color, is_default"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (nfcRes.error) {
      setMessage(nfcRes.error.message);
      setIsLoading(false);
      return;
    }

    const normalizedCards: NfcCard[] = (nfcRes.data ?? []).map((card) => {
      const linkedCardRaw = Array.isArray(card.linked_card)
        ? card.linked_card[0]
        : card.linked_card;
      return {
        id: String(card.id),
        nfc_uid: card.nfc_uid ?? null,
        status: card.status as NfcCard["status"],
        linked_card_id: card.linked_card_id ?? null,
        total_taps: card.total_taps ?? null,
        last_tapped_at: card.last_tapped_at ?? null,
        linked_card: linkedCardRaw ?? null,
      };
    });
    setNfcCards(normalizedCards);
    setBusinessCards((cardsRes.data ?? []) as BusinessCard[]);

    const cardIds = (nfcRes.data ?? []).map((card) => card.id);
    if (cardIds.length > 0) {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      const { data: tapLogs } = await supabase
        .from("nfc_tap_logs")
        .select("tapped_at, nfc_card_id")
        .in("nfc_card_id", cardIds)
        .gte("tapped_at", start.toISOString());

      const timestamps = (tapLogs ?? [])
        .map((row) => row.tapped_at as string)
        .filter(Boolean);
      setTapSeries(buildTapSeries(timestamps, locale));
    } else {
      setTapSeries(buildTapSeries([], locale));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleOpenModal = (card: NfcCard) => {
    setActiveCard(card);
    setSelectedLinkedCardId(card.linked_card_id ?? null);
    setIsModalOpen(true);
  };

  const handleSaveLinkedCard = async () => {
    if (!activeCard || !selectedLinkedCardId) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("change_nfc_linked_card", {
      p_nfc_card_id: activeCard.id,
      p_new_linked_card_id: selectedLinkedCardId,
    });

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    if (data && typeof data.success === "boolean" && !data.success) {
      setMessage(data.error ?? t("errors.updateLinkedCard"));
      setIsSaving(false);
      return;
    }

    setNfcCards((prev) =>
      prev.map((card) =>
        card.id === activeCard.id
          ? {
              ...card,
              linked_card_id: selectedLinkedCardId,
              linked_card:
                businessCards.find((item) => item.id === selectedLinkedCardId) ??
                card.linked_card,
            }
          : card
      )
    );

    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDeactivate = async (card: NfcCard) => {
    if (!window.confirm(t("actions.confirmDeactivate"))) {
      return;
    }

    setMessage(null);
    const { error } = await supabase
      .from("nfc_cards")
      .update({ status: "deactivated", updated_at: new Date().toISOString() })
      .eq("id", card.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setNfcCards((prev) =>
      prev.map((item) =>
        item.id === card.id ? { ...item, status: "deactivated" } : item
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="app-subtitle text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (nfcCards.length === 0) {
    return (
      <div className="app-card flex min-h-[70vh] flex-col items-center justify-center gap-4 border-dashed px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
          <Nfc className="h-7 w-7 text-primary-500" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {t("empty.title")}
        </h1>
        <p className="max-w-md text-sm text-neutral-500">
          {t("empty.body")}
        </p>
        <Link
          href="/dashboard/nfc"
          className="app-primary-btn px-5 py-2 text-sm font-semibold"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="app-kicker">
          {t("brand")}
        </p>
        <h1 className="app-title mt-2 text-2xl font-semibold">
          {t("title")}
        </h1>
        <p className="app-subtitle mt-2 text-sm">
          {t("subtitle")}
        </p>
      </div>

      {message ? (
        <p className="app-error px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {nfcCards.map((card) => {
            const statusColor =
              card.status === "active"
                ? "bg-emerald-500"
                : card.status === "suspended"
                ? "bg-rose-500"
                : "bg-slate-400";
            const statusLabel =
              card.status === "active"
                ? t("status.active")
                : card.status === "suspended"
                ? t("status.suspended")
                : card.status === "deactivated"
                ? t("status.deactivated")
                : t("status.other");
            const linked = card.linked_card;
            const patternClass =
              patternClassMap[linked?.background_pattern ?? "gradient-1"] ??
              patternClassMap["gradient-1"];

            return (
              <div
                key={card.id}
                className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                      <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                      {statusLabel}
                    </div>
                    <p className="mt-2 text-xl font-semibold text-neutral-900">
                      {formatUid(card.nfc_uid)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                      {t("linkedTo")}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className={`cardlink-cover ${patternClass} h-12 w-12 rounded-2xl`}
                        style={{
                          "--cardlink-base":
                            linked?.background_color ?? "#6366f1",
                        } as CSSProperties}
                      />
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">
                          {linked?.card_name ??
                            linked?.full_name ??
                            t("noCardSelected")}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {linked?.title ?? t("personal")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-neutral-500">
                      <Zap className="h-4 w-4 text-primary-500" />
                      {t("stats.totalTaps", { count: card.total_taps ?? 0 })}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {t("stats.lastTapped", {
                        date: formatDate(
                          card.last_tapped_at,
                          locale,
                          t("never")
                        ),
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(card)}
                        disabled={card.status !== "active"}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PencilLine className="h-3 w-3" />
                        {t("actions.changeLinkedCard")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(card)}
                        disabled={card.status === "deactivated"}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Power className="h-3 w-3" />
                        {t("actions.deactivate")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {t("chart.label")}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-900">
                {t("chart.title")}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50">
              <CreditCard className="h-5 w-5 text-primary-500" />
            </div>
          </div>
          <div className="mt-6 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tapSeries}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#eef2ff" }}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="taps" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {isModalOpen && activeCard ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  {t("modal.label")}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-neutral-900">
                  {t("modal.title")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500"
              >
                {t("modal.close")}
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {businessCards.map((card) => {
                const patternClass =
                  patternClassMap[card.background_pattern ?? "gradient-1"] ??
                  patternClassMap["gradient-1"];
                const isSelected = card.id === selectedLinkedCardId;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedLinkedCardId(card.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-100 bg-white"
                    }`}
                  >
                    <div
                      className={`cardlink-cover ${patternClass} h-14 rounded-2xl`}
                      style={{
                        "--cardlink-base": card.background_color ?? "#6366f1",
                      } as CSSProperties}
                    />
                    <p className="mt-3 text-sm font-semibold text-neutral-900">
                      {card.card_name ??
                        card.full_name ??
                        t("modal.untitled")}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {card.title ?? t("personal")}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600"
              >
                {t("modal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveLinkedCard}
                disabled={isSaving || !selectedLinkedCardId}
                className="rounded-full bg-primary-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? t("modal.saving") : t("modal.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
