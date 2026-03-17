"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import { resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import QRCodeModal from "@/components/QRCodeModal";
import ContactsPanel from "@/components/ContactsPanel";
import NfcCardsPanel from "@/components/NfcCardsPanel";

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
  activeTab: "cards" | "contacts" | "nfc";
  isOwner: boolean;
}) {
  const t = useTranslations("cards.tabs");
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/cards"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "cards"
            ? "bg-primary-600 text-white shadow-sm"
            : "app-secondary-btn text-neutral-500"
        }`}
      >
        {t("cards")}
      </Link>
      <Link
        href="/dashboard/cards?tab=contacts"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "contacts"
            ? "bg-primary-600 text-white shadow-sm"
            : "app-secondary-btn text-neutral-500"
        }`}
      >
        {t("contacts")}
      </Link>
      <Link
        href="/dashboard/cards?tab=nfc"
        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
          activeTab === "nfc"
            ? "bg-primary-600 text-white shadow-sm"
            : "app-secondary-btn text-neutral-500"
        }`}
      >
        {t("nfc")}
      </Link>
      {isOwner ? (
        <Link
          href="/business/company-cards"
          className="app-secondary-btn rounded-full px-4 py-2 text-xs font-semibold text-neutral-500 transition"
        >
          Company Cards
        </Link>
      ) : null}
    </div>
  );
}

export default function CardsDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("cards");
  const locale = useLocale();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "contacts"
      ? "contacts"
      : tabParam === "nfc"
      ? "nfc"
      : "cards";
  const [cards, setCards] = useState<CardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [qrCard, setQrCard] = useState<CardRow | null>(null);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");
  const [isOwner, setIsOwner] = useState(false);
  const [companyAccountCompanyId, setCompanyAccountCompanyId] = useState<string | null>(null);
  const [nfcLinkedCardId, setNfcLinkedCardId] = useState<string | null>(null);

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
        .select("plan, premium_until")
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

    setViewerPlan(resolveEffectiveViewerPlan(profileData));
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

    // Fetch NFC-linked card id so we can highlight it as the main card
    const { data: nfcData } = await supabase
      .from("nfc_cards")
      .select("linked_card_id")
      .eq("owner_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    setNfcLinkedCardId((nfcData as { linked_card_id: string | null } | null)?.linked_card_id ?? null);

    setIsLoading(false);
  };

  useEffect(() => {
    void loadCards();
  }, []);

  useEffect(() => {
    if (tabParam === "company" && isOwner) {
      router.replace("/business/company-cards");
    }
  }, [isOwner, router, tabParam]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">{t("title")}</h2>
          <p className="text-xs text-neutral-500">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={createCard}
          disabled={cards.length >= (viewerPlan === "premium" ? Number.POSITIVE_INFINITY : companyAccountCompanyId ? 2 : 1)}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("actions.create")}
        </button>
      </div>

      <CardsTabs activeTab="cards" isOwner={isOwner} />

      {message ? (
        <p className="app-error px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {/* Hero — main namecard preview (NFC-linked card or first card) */}
      {!isLoading && cards.length > 0 ? (() => {
        const mainCard = (nfcLinkedCardId && cards.find((c) => c.id === nfcLinkedCardId)) || cards[0];
        const patternClass =
          patternClassMap[mainCard.background_pattern ?? "gradient-1"] ??
          patternClassMap["gradient-1"];
        return (
          <Link
            href={`/dashboard/cards/${mainCard.id}`}
            className={`cardlink-cover ${patternClass} relative block overflow-hidden rounded-2xl p-5 shadow-lg`}
            style={{ "--cardlink-base": mainCard.background_color ?? "#6366f1" } as React.CSSProperties}
          >
            <div className="relative z-10 flex flex-col justify-between min-h-[140px] text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider opacity-80">CARDLINK</span>
                {nfcLinkedCardId === mainCard.id ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">NFC</span>
                ) : null}
              </div>
              <div>
                <p className="text-base font-bold leading-tight">
                  {mainCard.full_name || t("card.defaultUser")}
                </p>
                {mainCard.title ? (
                  <p className="mt-0.5 text-xs opacity-80">{mainCard.title}</p>
                ) : null}
                <p className="mt-1 text-[10px] tracking-wide opacity-60">
                  {mainCard.card_name || t("card.defaultName")}
                </p>
              </div>
            </div>
          </Link>
        );
      })() : null}

      {/* Action buttons — Reference 3-col */}
      {!isLoading && cards.length > 0 ? (
        <div className="flex gap-3">
          {[
            { icon: Eye, label: t("actions.edit") },
            { icon: CreditCard, label: t("actions.share") },
            { icon: QrCode, label: t("actions.qr") },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (action.icon === Eye) router.push(`/dashboard/cards/${cards[0].id}`);
                else if (action.icon === CreditCard) void handleCopyLink(cards[0].slug);
                else setQrCard(cards[0]);
              }}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-neutral-50 py-3 transition hover:bg-neutral-100"
            >
              <action.icon className="h-4 w-4 text-primary-600" />
              <span className="text-xs text-neutral-600">{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : null}

      {!isLoading && cards.length === 0 ? (
        <div className="rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500">
          {t("empty")}
        </div>
      ) : null}

      {/* All Cards — Reference list with chevron */}
      {!isLoading && cards.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-800">
              {t("title")}
            </span>
          </div>
          <div className="space-y-2">
            {cards.map((card) => {
              const patternClass =
                patternClassMap[card.background_pattern ?? "gradient-1"] ??
                patternClassMap["gradient-1"];

              return (
                <Link
                  key={card.id}
                  href={`/dashboard/cards/${card.id}`}
                  className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 transition hover:bg-neutral-100"
                >
                  <div
                    className={`cardlink-cover ${patternClass} h-10 w-10 shrink-0 rounded-lg`}
                    style={{ "--cardlink-base": card.background_color ?? "#6366f1" } as React.CSSProperties}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {card.card_name || t("card.defaultName")}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {card.full_name || t("card.defaultUser")}
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {qrCard ? (
        <QRCodeModal
          slug={qrCard.slug ?? ""}
          fullName={qrCard.full_name ?? qrCard.card_name ?? t("card.defaultUser")}
          title={qrCard.title}
          onClose={() => setQrCard(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
