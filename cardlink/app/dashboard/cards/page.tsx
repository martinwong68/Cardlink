"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  ExternalLink,
  Pencil,
  Plus,
  QrCode,
  Share2,
  Trash2,
  User,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Phone,
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

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
  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs font-semibold transition ${
      active
        ? "bg-primary-600 text-white shadow-sm"
        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
    }`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/dashboard/cards" className={tabClass(activeTab === "cards")}>
        {t("cards")}
      </Link>
      <Link
        href="/dashboard/cards?tab=contacts"
        className={tabClass(activeTab === "contacts")}
      >
        {t("contacts")}
      </Link>
      <Link
        href="/dashboard/cards?tab=nfc"
        className={tabClass(activeTab === "nfc")}
      >
        {t("nfc")}
      </Link>
      {isOwner ? (
        <Link
          href="/business/company-cards"
          className={tabClass(false)}
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nfcExtraSlots, setNfcExtraSlots] = useState(0);
  const [purchasedSlots, setPurchasedSlots] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const pushToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.max(0, Math.min(index, cards.length - 1)));
  }, [cards.length]);

  const scrollToCard = useCallback((index: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    el.scrollTo({ left: clamped * el.offsetWidth, behavior: "smooth" });
    setActiveCardIndex(clamped);
  }, [cards.length]);

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
      { data: nfcData },
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
        .select("plan, premium_until, avatar_url, purchased_card_slots")
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
      supabase
        .from("nfc_cards")
        .select("id, premium_granted_until")
        .eq("owner_id", userData.user.id)
        .eq("status", "active")
        .gt("premium_granted_until", new Date().toISOString()),
    ]);

    setViewerPlan(resolveEffectiveViewerPlan(profileData));
    setAvatarUrl((profileData as { avatar_url?: string | null } | null)?.avatar_url ?? null);
    setPurchasedSlots((profileData as { purchased_card_slots?: number | null } | null)?.purchased_card_slots ?? 0);
    setNfcExtraSlots(((nfcData ?? []) as { id: string }[]).length);
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

    /* Card slot logic: base 1 free + NFC extra slots + purchased slots ($8/mo each).
       Premium users get unlimited, company-managed accounts get 2. */
    const maxCardsForCurrentUser = viewerPlan === "premium"
      ? Number.POSITIVE_INFINITY
      : companyAccountCompanyId
        ? 2
        : 1 + nfcExtraSlots + purchasedSlots;

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
    <div className="space-y-5">
      {/* Tabs + Create */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CardsTabs activeTab="cards" isOwner={isOwner} />
        <button
          type="button"
          onClick={createCard}
          disabled={cards.length >= (viewerPlan === "premium" ? Number.POSITIVE_INFINITY : companyAccountCompanyId ? 2 : 1)}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("actions.create")}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-error-light px-4 py-3 text-sm text-error-dark">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-neutral-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : null}

      {!isLoading && cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <User className="h-7 w-7 text-primary-400" />
          </div>
          <p className="text-sm font-medium text-neutral-700">{t("empty")}</p>
          <p className="mt-1 text-xs text-neutral-400">Create your first digital namecard</p>
        </div>
      ) : null}

      {/* ── Card Slider ── */}
      {!isLoading && cards.length > 0 ? (
        <div className="relative">
          {/* Slider container */}
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {cards.map((card, idx) => {
              const patternClass =
                patternClassMap[card.background_pattern ?? "gradient-1"] ??
                patternClassMap["gradient-1"];
              const viewCount = card.card_shares?.[0]?.count ?? 0;
              const initials = getInitials(card.full_name);
              const baseColor = card.background_color ?? "#6366f1";

              return (
                <div
                  key={card.id}
                  className="w-full flex-shrink-0 snap-center px-4"
                >
                  <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-md">
                    {/* Badge */}
                    {viewerPlan === "premium" || card.company_id ? (
                      <div className="absolute right-7 top-3 z-10">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            card.company_id
                              ? "bg-secondary-100 text-secondary-700"
                              : "bg-primary-100 text-primary-700"
                          }`}
                        >
                          {card.company_id
                            ? t("badges.company")
                            : t("badges.premium")}
                        </span>
                      </div>
                    ) : null}

                    {/* Pattern header */}
                    <div className="relative">
                      <div
                        className={`cardlink-cover ${patternClass} h-36`}
                        style={{
                          "--cardlink-base": baseColor,
                        } as React.CSSProperties}
                      />
                      {/* Curved bottom overlay */}
                      <div
                        className="absolute -bottom-1 left-0 right-0 h-8"
                        style={{
                          background: "white",
                          borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                        }}
                      />
                    </div>

                    {/* Avatar – centered, overlapping header */}
                    <div className="relative -mt-14 flex justify-center">
                      <div
                        className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-2xl font-bold text-white shadow-lg"
                        style={{ backgroundColor: baseColor }}
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={card.full_name ?? ""}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                    </div>

                    {/* Info section — centered */}
                    <div className="px-6 pb-6 pt-3 text-center">
                      <h3 className="text-lg font-bold text-neutral-900">
                        {card.full_name || t("card.defaultUser")}
                      </h3>
                      {card.title ? (
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {card.title}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {card.card_name || t("card.defaultName")}
                      </p>

                      {/* Quick contact icons row */}
                      <div className="mx-auto mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition hover:bg-primary-100"
                          title="Phone"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition hover:bg-primary-100"
                          title="Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition hover:bg-primary-100"
                          title="Website"
                        >
                          <Globe className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrCard(card)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition hover:bg-primary-100"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {viewCount} views
                        </span>
                        <span>
                          {t("card.created", {
                            date: formatDate(card.created_at, locale),
                          })}
                        </span>
                      </div>

                      {/* Slug / link preview */}
                      {card.slug ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                          <Globe className="h-3 w-3" />
                          <span className="truncate">/c/{card.slug}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prev / Next arrows (desktop) */}
          {cards.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => scrollToCard(activeCardIndex - 1)}
                disabled={activeCardIndex === 0}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur transition hover:bg-white disabled:opacity-0 hidden sm:flex"
                aria-label="Previous card"
              >
                <ChevronLeft className="h-5 w-5 text-neutral-600" />
              </button>
              <button
                type="button"
                onClick={() => scrollToCard(activeCardIndex + 1)}
                disabled={activeCardIndex === cards.length - 1}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur transition hover:bg-white disabled:opacity-0 hidden sm:flex"
                aria-label="Next card"
              >
                <ChevronRight className="h-5 w-5 text-neutral-600" />
              </button>
            </>
          ) : null}

          {/* Pagination dots */}
          {cards.length > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => scrollToCard(i)}
                  aria-label={`Go to card ${i + 1}`}
                  className={`rounded-full transition-all ${
                    i === activeCardIndex
                      ? "h-2.5 w-2.5 bg-primary-600"
                      : "h-2 w-2 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                />
              ))}
            </div>
          ) : null}

          {/* Card count indicator */}
          {cards.length > 1 ? (
            <div className="mt-2 text-center text-xs text-neutral-400">
              {activeCardIndex + 1} / {cards.length}
            </div>
          ) : null}

          {/* Action buttons for active card */}
          {cards.length > 0 ? (
            <div className="mt-5 flex gap-2 px-4">
              <Link
                href={`/dashboard/cards/${cards[activeCardIndex]?.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("actions.edit")}
              </Link>
              <button
                type="button"
                onClick={() => handleCopyLink(cards[activeCardIndex]?.slug)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs font-semibold text-neutral-700 transition hover:border-primary-200 hover:text-primary-600"
              >
                <Share2 className="h-3.5 w-3.5" />
                {t("actions.share")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const card = cards[activeCardIndex];
                  if (card) setQrCard(card);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs font-semibold text-neutral-700 transition hover:border-primary-200 hover:text-primary-600"
              >
                <QrCode className="h-3.5 w-3.5" />
              </button>
              {cards[activeCardIndex]?.slug ? (
                <Link
                  href={`/c/${cards[activeCardIndex]?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs font-semibold text-neutral-700 transition hover:border-primary-200 hover:text-primary-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* Delete for active card */}
          {cards.length > 0 ? (
            <div className="mt-2 px-4">
              <button
                type="button"
                onClick={() => {
                  const card = cards[activeCardIndex];
                  if (card) handleDelete(card.id);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-neutral-400 transition hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
                {t("actions.delete")}
              </button>
            </div>
          ) : null}
        </div>
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
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
