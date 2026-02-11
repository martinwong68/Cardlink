"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CheckCircle, CreditCard, Sparkles } from "lucide-react";

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

type CardRow = {
  id: string;
  card_name: string | null;
  full_name: string | null;
  title: string | null;
  background_pattern: string | null;
  background_color: string | null;
  is_default: boolean | null;
};

type RegisterState = "idle" | "submitting" | "success" | "error";

type RegisterError = "already" | "invalid" | "unknown";

const maskUid = (uid: string) => {
  const suffix = uid.slice(-4).toUpperCase();
  return `NFC_${"*".repeat(4)}${suffix}`;
};

export default function RegisterNfcCardPage() {
  const params = useParams();
  const uid = typeof params.uid === "string" ? params.uid : "";
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registerState, setRegisterState] = useState<RegisterState>("idle");
  const [registerError, setRegisterError] = useState<RegisterError>("unknown");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setMessage(null);

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(data.user.id);

      const { data: cardData, error: cardError } = await supabase
        .from("business_cards")
        .select(
          "id, card_name, full_name, title, background_pattern, background_color, is_default"
        )
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (cardError) {
        setMessage(cardError.message);
        setIsLoading(false);
        return;
      }

      const nextCards = (cardData ?? []) as CardRow[];
      setCards(nextCards);

      const defaultCard = nextCards.find((card) => card.is_default);
      setSelectedCardId(defaultCard?.id ?? nextCards[0]?.id ?? null);
      setIsLoading(false);
    };

    void load();
  }, [supabase]);

  const handleRegister = async () => {
    if (!selectedCardId) {
      setMessage("Select a business card first.");
      return;
    }

    setMessage(null);
    setRegisterState("submitting");
    setRegisterError("unknown");

    const { data, error } = await supabase.rpc("register_nfc_card", {
      p_nfc_uid: uid,
      p_linked_card_id: selectedCardId,
    });

    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("already")) {
        setRegisterError("already");
      } else if (text.includes("invalid") || text.includes("not recognized")) {
        setRegisterError("invalid");
      }
      setRegisterState("error");
      return;
    }

    if (data && typeof data.success === "boolean" && !data.success) {
      const errorText = String(data.error ?? "").toLowerCase();
      if (errorText.includes("already")) {
        setRegisterError("already");
      } else if (errorText.includes("invalid") || errorText.includes("not")) {
        setRegisterError("invalid");
      }
      setRegisterState("error");
      return;
    }

    setRegisterState("success");
  };

  const returnTo = `/register/${uid}`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4 py-12">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 text-center">
          <div className="rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            CardLink
          </div>
          <div className="relative h-44 w-72 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 shadow-2xl">
            <div className="absolute inset-0 rounded-3xl border border-white/40" />
            <div className="absolute left-6 top-6 h-10 w-10 rounded-full bg-white/40" />
            <div className="absolute right-6 bottom-6 h-6 w-16 rounded-full bg-white/30" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Activate Your CardLink Card
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Sign in or create an account to link this NFC card to your digital
              business card.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="flex items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Sign In
            </Link>
            <Link
              href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
              className="flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (registerState === "success") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600 motion-safe:animate-bounce" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">
            Your card is active!
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            When someone taps your NFC card, they'll see your business card.
          </p>
          <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Test your card
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Tap your NFC card on a phone to confirm everything is working.
              Share the tap link if you want to preview it.
            </p>
          </div>
          <div className="mt-6 flex w-full flex-col gap-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href={`/tap/${uid}`}
              className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Test your card
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
            <Sparkles className="h-3 w-3" />
            CardLink
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Link Your NFC Card
          </h1>
          <p className="text-sm text-slate-600">
            Card ID: <span className="font-semibold">{maskUid(uid)}</span>
          </p>
          <p className="text-sm text-slate-600">
            Choose which business card you want to link to this physical NFC
            card. When someone taps your card, they'll see the linked business
            card.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Create a business card first
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You'll need at least one digital card to link this NFC card.
            </p>
            <Link
              href="/dashboard/cards"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Go to My Cards
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const patternClass =
                patternClassMap[card.background_pattern ?? "gradient-1"] ??
                patternClassMap["gradient-1"];
              const isSelected = card.id === selectedCardId;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCardId(card.id)}
                  className={`rounded-3xl border px-4 py-5 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-white shadow-md"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div
                    className={`cardlink-cover ${patternClass} h-20 rounded-2xl`}
                    style={{
                      "--cardlink-base": card.background_color ?? "#6366f1",
                    } as CSSProperties}
                  />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {card.card_name ?? card.full_name ?? "Untitled Card"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {card.title ?? "Personal"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {message ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {message}
          </p>
        ) : null}

        {registerState === "error" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {registerError === "already"
              ? "This card is already linked to an account. If this is your card, go to Dashboard to manage it."
              : registerError === "invalid"
              ? "This card ID is not recognized. Please contact support."
              : "Something went wrong while activating your card. Please try again."}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleRegister}
            disabled={registerState === "submitting" || cards.length === 0}
            className="flex flex-1 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {registerState === "submitting" ? "Activating..." : "Activate Card"}
          </button>
          <Link
            href="/dashboard"
            className="flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
