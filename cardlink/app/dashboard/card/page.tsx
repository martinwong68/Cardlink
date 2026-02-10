"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";
import QRCodeModal from "@/components/QRCodeModal";
import ContactsPanel from "@/components/ContactsPanel";

const visibilityStyles: Record<string, string> = {
  public: "border-emerald-200 bg-emerald-50 text-emerald-700",
  friends: "border-amber-200 bg-amber-50 text-amber-700",
  hidden: "border-slate-200 bg-slate-100 text-slate-600",
};

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
  sort_order: number | null;
};

type BusinessCard = {
  id: string;
  slug: string | null;
  full_name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  card_fields?: CardField[] | null;
};

export default function CardPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const activeTab = searchParams.get("tab") === "contacts" ? "contacts" : "cards";
  const shareUrl = useMemo(() => {
    if (!card?.slug) {
      return "";
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (base) {
      return `${base.replace(/\/$/, "")}/c/${card.slug}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/c/${card.slug}`;
  }, [card?.slug]);

  const loadDefaultCard = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setErrorMessage("Please sign in to view your card.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("business_cards")
      .select(
        "id, slug, full_name, title, company, bio, card_fields(id, field_type, field_label, field_value, visibility, sort_order)"
      )
      .eq("user_id", userData.user.id)
      .eq("is_default", true)
      .order("sort_order", { foreignTable: "card_fields", ascending: true })
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setCard(data ?? null);
    setIsLoading(false);
  };

  const createDefaultCard = async () => {
    setErrorMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setErrorMessage("Please sign in to create a card.");
      return;
    }

    const displayName =
      typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name
        : userData.user.email ?? "";

    const baseSlug = (displayName || "card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("business_cards")
      .insert({
        user_id: userData.user.id,
        card_name: "Default Card",
        is_default: true,
        full_name: displayName || "",
        slug: baseSlug || `card-${userData.user.id.slice(0, 8)}`,
      })
      .select(
        "id, slug, full_name, title, company, bio, card_fields(id, field_type, field_label, field_value, visibility, sort_order)"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCard(data);
  };

  useEffect(() => {
    void loadDefaultCard();
  }, []);

  if (isLoading && activeTab === "cards") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading card...
      </div>
    );
  }

  if (!card && activeTab === "cards") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          No card yet
        </h1>
        <p className="text-sm text-slate-500">
          Create your first CardLink business card in seconds.
        </p>
        {errorMessage ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {errorMessage}
          </p>
        ) : null}
        <button
          onClick={createDefaultCard}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          Create Your First Card
        </button>
      </div>
    );
  }

  const cardFields = card?.card_fields ?? [];

  const handleCopyLink = async () => {
    if (!shareUrl) {
      setShareMessage("Missing card link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link copied to clipboard.");
    } catch {
      setShareMessage("Unable to copy the link.");
    }
  };

  const handleShareNfc = async () => {
    if (!shareUrl) {
      setShareMessage("Missing card link.");
      return;
    }

    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setShareMessage("NFC is not supported on this device.");
      return;
    }

    try {
      const ndef = new (window as typeof window & { NDEFReader: any }).NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: shareUrl }] });
      setShareMessage("Ready to tap and share via NFC.");
    } catch {
      setShareMessage("Unable to share via NFC.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/card"
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "cards"
              ? "bg-violet-600 text-white"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          My Cards
        </Link>
        <Link
          href="/dashboard/card?tab=contacts"
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "contacts"
              ? "bg-violet-600 text-white"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          Contacts / CRM
        </Link>
      </div>

      {activeTab === "contacts" ? (
        <ContactsPanel />
      ) : (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 p-6 text-white shadow-xl">
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-semibold">
                  {card?.full_name || "Your Name"}
                </p>
                <p className="text-sm text-slate-200">
                  {card?.title || "Your title"}
                </p>
                <p className="text-sm text-slate-300">
                  {card?.company || "Your company"}
                </p>
              </div>
              <p className="text-sm text-slate-200">
                {card?.bio || "Add a short bio to introduce yourself."}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {cardFields.length === 0 ? (
                <p className="text-sm text-slate-300">
                  Add contact fields to make your card shareable.
                </p>
              ) : (
                cardFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {field.field_label || field.field_type}
                      </p>
                      <p className="text-xs text-slate-300">
                        {field.field_value}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold capitalize ${
                        visibilityStyles[field.visibility]
                      }`}
                    >
                      {field.visibility}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          {shareMessage ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {shareMessage}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setIsQrOpen(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              Show QR Code
            </button>
            <button
              onClick={handleCopyLink}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              Copy Share Link
            </button>
            <button
              onClick={handleShareNfc}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              Share via NFC
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/card/edit"
              className="rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              Edit Card Details
            </Link>
            <Link
              href="/dashboard/card/edit?tab=fields"
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              Manage Fields
            </Link>
          </div>
        </>
      )}
      {isQrOpen && card ? (
        <QRCodeModal
          slug={card.slug ?? ""}
          fullName={card.full_name ?? "CardLink User"}
          title={card.title}
          onClose={() => setIsQrOpen(false)}
        />
      ) : null}
    </div>
  );
}
