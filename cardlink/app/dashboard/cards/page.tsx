"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  Pencil,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import QRCodeModal from "@/components/QRCodeModal";
import ContactsPanel from "@/components/ContactsPanel";
import NfcCardsPanel from "@/components/NfcCardsPanel";
import CompanyCardsManagementPanel from "@/components/CompanyCardsManagementPanel";

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

type CardRow = {
  id: string;
  company_id: string | null;
  card_name: string | null;
  slug: string | null;
  full_name: string | null;
  title: string | null;
  background_pattern: string | null;
  background_color: string | null;
  created_at: string;
  card_shares?: { count: number }[] | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function CardsTabs({
  activeTab,
  isOwner,
}: {
  activeTab: "cards" | "contacts" | "nfc" | "company";
  isOwner: boolean;
}) {
  const t = useTranslations("cards.tabs");
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/cards"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "cards"
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40"
            : "app-secondary-btn text-slate-500"
        }`}
      >
        {t("cards")}
      </Link>
      <Link
        href="/dashboard/cards?tab=contacts"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "contacts"
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40"
            : "app-secondary-btn text-slate-500"
        }`}
      >
        {t("contacts")}
      </Link>
      <Link
        href="/dashboard/cards?tab=nfc"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "nfc"
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40"
            : "app-secondary-btn text-slate-500"
        }`}
      >
        {t("nfc")}
      </Link>
      {isOwner ? (
        <Link
          href="/dashboard/cards?tab=company"
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "company"
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40"
              : "app-secondary-btn text-slate-500"
          }`}
        >
          Company Cards
        </Link>
      ) : null}
    </div>
  );
}

export default function CardsDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const t = useTranslations("cards");
  const locale = useLocale();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "contacts"
      ? "contacts"
      : tabParam === "nfc"
      ? "nfc"
      : tabParam === "company"
      ? "company"
      : "cards";
  const [cards, setCards] = useState<CardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [qrCard, setQrCard] = useState<CardRow | null>(null);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const [isOwner, setIsOwner] = useState(false);
  const [companyAccountCompanyId, setCompanyAccountCompanyId] = useState<string | null>(null);

  const pushToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  };

  const loadCards = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInView"));
      setIsLoading(false);
      return;
    }

    const [
      { data, error },
      { data: profileData },
      { data: companyRoleData },
      { data: createdCompanyData },
      { data: adminCompanyIdsData },
    ] = await Promise.all([
      supabase
        .from("business_cards")
        .select(
          "id, company_id, card_name, slug, full_name, title, background_pattern, background_color, created_at, card_shares(count)"
        )
        .eq("user_id", userData.user.id)
        .or("is_company_profile.is.false,is_company_profile.is.null")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("plan")
        .eq("id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("company_id, role, status")
        .eq("user_id", userData.user.id)
        .eq("status", "active"),
      supabase
        .from("companies")
        .select("id")
        .eq("created_by", userData.user.id),
      supabase.rpc("get_my_admin_company_ids"),
    ]);

    setViewerPlan(profileData?.plan === "premium" ? "premium" : "free");
    const ownerByRole = ((companyRoleData ?? []) as { role: string }[]).some(
      (item) =>
        ["owner", "admin", "manager", "company_owner", "company_admin"].includes(
          (item.role ?? "").toLowerCase()
        )
    );
    const ownerByCreator = ((createdCompanyData ?? []) as { id: string }[]).length > 0;
    const ownerByRpc = ((adminCompanyIdsData ?? []) as { company_id: string }[]).length > 0;
    setIsOwner(ownerByRole || ownerByCreator || ownerByRpc);

    const memberCompanyIds = Array.from(
      new Set(((companyRoleData ?? []) as { company_id: string }[]).map((item) => item.company_id))
    );
    const isCompanyManagedAccount = memberCompanyIds.length > 0 && !ownerByRole && !ownerByCreator && !ownerByRpc;
    setCompanyAccountCompanyId(isCompanyManagedAccount && memberCompanyIds.length === 1 ? memberCompanyIds[0] : null);

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setCards((data as CardRow[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const createCard = async () => {
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInCreate"));
      return;
    }

    const maxCardsForCurrentUser = viewerPlan === "premium" ? Number.POSITIVE_INFINITY : companyAccountCompanyId ? 2 : 1;

    if (cards.length >= maxCardsForCurrentUser) {
      setMessage(
        companyAccountCompanyId
          ? t("errors.companyCardLimit")
          : t("errors.upgradeToCreate")
      );
      return;
    }

    const displayName =
      typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name
        : userData.user.email ?? "";
    const baseSlug = slugify(displayName || "card");
    const slugSuffix = Date.now().toString(36).slice(-5);
    const slug = `${baseSlug || "card"}-${slugSuffix}`;

    const { data, error } = await supabase
      .from("business_cards")
      .insert({
        user_id: userData.user.id,
        card_name: "My Card",
        is_default: false,
        company_id: companyAccountCompanyId,
        full_name: displayName,
        slug,
        background_pattern: "gradient-1",
        background_color: "#6366f1",
        template: "classic-business",
      })
      .select(
        "id, card_name, slug, full_name, title, background_pattern, background_color, created_at, card_shares(count)"
      )
      .single();

    if (error || !data) {
      setMessage(error?.message ?? t("errors.createFailed"));
      return;
    }

    setCards((prev) => [data as CardRow, ...prev]);
    pushToast(t("toast.created"));
  };

  const shareUrlFor = (slug: string | null) => {
    if (!slug) {
      return "";
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (base) {
      return `${base.replace(/\/$/, "")}/c/${slug}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/c/${slug}`;
  };

  const handleCopyLink = async (slug: string | null) => {
    const url = shareUrlFor(slug);
    if (!url) {
      pushToast(t("errors.missingLink"));
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      pushToast(t("toast.linkCopied"));
    } catch {
      pushToast(t("errors.copyFailed"));
    }
  };

  const handleDelete = async (cardId: string) => {
    const confirmed = window.confirm(t("actions.confirmDelete"));
    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("business_cards")
      .delete()
      .eq("id", cardId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCards((prev) => prev.filter((card) => card.id !== cardId));
    pushToast(t("toast.deleted"));
  };

  if (activeTab === "contacts") {
    return (
      <div className="space-y-6">
        <CardsTabs activeTab="contacts" isOwner={isOwner} />
        <ContactsPanel />
      </div>
    );
  }

  if (activeTab === "nfc") {
    return (
      <div className="space-y-6">
        <CardsTabs activeTab="nfc" isOwner={isOwner} />
        <NfcCardsPanel />
      </div>
    );
  }

  if (activeTab === "company" && isOwner) {
    return (
      <div className="space-y-6">
        <CardsTabs activeTab="company" isOwner={isOwner} />
        <CompanyCardsManagementPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="app-kicker">
            {t("brand")}
          </p>
          <h1 className="app-title mt-2 text-2xl font-semibold">
            {t("title")}
          </h1>
          <p className="app-subtitle mt-1 text-sm">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={createCard}
          disabled={cards.length >= (viewerPlan === "premium" ? Number.POSITIVE_INFINITY : companyAccountCompanyId ? 2 : 1)}
          className="app-primary-btn flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("actions.create")}
        </button>
      </div>

      <CardsTabs activeTab="cards" isOwner={isOwner} />

      {message ? (
        <p className="app-error px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : null}

      {!isLoading && cards.length === 0 ? (
        <div className="app-card p-8 text-center text-sm text-slate-500">
          {t("empty")}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => {
          const patternClass =
            patternClassMap[card.background_pattern ?? "gradient-1"] ??
            patternClassMap["gradient-1"];
          const viewCount = card.card_shares?.[0]?.count ?? 0;

          return (
            <div
              key={card.id}
              className="app-card relative p-5"
            >
              {viewerPlan === "premium" ? (
                <div className="absolute -right-2 top-4 z-10">
                  {card.company_id ? (
                    <span className="inline-flex items-center rounded-l-full bg-slate-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow">
                      {t("badges.company")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-l-full bg-slate-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow">
                      {t("badges.premium")}
                    </span>
                  )}
                </div>
              ) : card.company_id ? (
                <div className="absolute -right-2 top-4 z-10">
                  <span className="inline-flex items-center rounded-l-full bg-slate-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow">
                    {t("badges.company")}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className={`cardlink-cover ${patternClass} h-24 w-full rounded-2xl sm:h-28 sm:w-40`}
                  style={{
                    "--cardlink-base": card.background_color ?? "#6366f1",
                  } as React.CSSProperties}
                />
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900">
                    {card.card_name || t("card.defaultName")}
                  </p>
                  <p className="text-sm text-slate-600">
                    {card.full_name || t("card.defaultUser")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {card.title || ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {t("card.slug", {
                        slug: card.slug || t("card.unpublished"),
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {viewCount}
                    </span>
                    <span>
                      {t("card.created", {
                        date: formatDate(card.created_at, locale),
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("actions.edit")}
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyLink(card.slug)}
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("actions.share")}
                </button>
                <button
                  type="button"
                  onClick={() => setQrCard(card)}
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {t("actions.qr")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(card.id)}
                  className="flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("actions.delete")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {qrCard ? (
        <QRCodeModal
          slug={qrCard.slug ?? ""}
          fullName={qrCard.full_name ?? qrCard.card_name ?? t("card.defaultUser")}
          title={qrCard.title}
          onClose={() => setQrCard(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
