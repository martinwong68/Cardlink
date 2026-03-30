"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/src/lib/supabase/client";

type ProfileData = {
  plan?: string | null;
  premium_until?: string | null;
  purchased_card_slots?: number | null;
};

const SLOT_PRICE = 8; // dollars per slot

export default function CardSlotsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [purchasedSlots, setPurchasedSlots] = useState(0);
  const [usedSlots, setUsedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [qty, setQty] = useState(1);

  const freeSlots = 1; // every user gets 1 free card slot
  const totalSlots = freeSlots + purchasedSlots;
  const availableSlots = totalSlots - usedSlots;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Load profile for slot count
      const { data: profile } = await supabase
        .from("profiles")
        .select("purchased_card_slots")
        .eq("id", userData.user.id)
        .maybeSingle();
      setPurchasedSlots((profile as ProfileData | null)?.purchased_card_slots ?? 0);

      // Load cards count for usage
      const { count } = await supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id);
      setUsedSlots(count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle purchase success redirect
  useEffect(() => {
    if (searchParams.get("card_slot") !== "success") return;

    const updateSlots = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: updated, error } = await supabase.rpc(
        "increment_purchased_card_slots" as string,
        { p_user_id: userData.user.id },
      );
      if (error) {
        // Fallback: read-then-write if RPC doesn't exist
        const { data: profile } = await supabase
          .from("profiles")
          .select("purchased_card_slots")
          .eq("id", userData.user.id)
          .maybeSingle();
        const currentSlots = (profile as ProfileData | null)?.purchased_card_slots ?? 0;
        await supabase
          .from("profiles")
          .update({ purchased_card_slots: currentSlots + 1 })
          .eq("id", userData.user.id);
        setPurchasedSlots(currentSlots + 1);
      } else {
        setPurchasedSlots(typeof updated === "number" ? updated : purchasedSlots + 1);
      }
      setMessage({ type: "success", text: "Card slot purchased successfully!" });

      // Clean URL
      router.replace("/dashboard/settings/card-slots", { scroll: false });
    };
    void updateSlots();
  }, [searchParams, supabase, router, purchasedSlots]);

  const handlePurchase = async () => {
    setMessage(null);
    setPurchasing(true);
    try {
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "payment",
          amount: SLOT_PRICE * qty,
          description: `Extra Namecard Slot${qty > 1 ? ` x${qty}` : ""}`,
          successUrl: `${origin}/dashboard/settings/card-slots?card_slot=success`,
          cancelUrl: `${origin}/dashboard/settings/card-slots`,
        }),
      });
      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to start checkout." });
        setPurchasing(false);
        return;
      }
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      setMessage({ type: "error", text: "Failed to start checkout." });
    }
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="rounded-lg p-1.5 hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Card Slots</h1>
          <p className="text-xs text-gray-500">Manage your namecard slots</p>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Usage Overview</h2>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{usedSlots} of {totalSlots} slots used</span>
            <span>{availableSlots} available</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${totalSlots > 0 ? Math.min((usedSlots / totalSlots) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Slot breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{freeSlots}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Free</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{purchasedSlots}</p>
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider">Purchased</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalSlots}</p>
            <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700">Purchase Card Slots</h2>
        </div>

        <p className="text-xs text-gray-500">
          Each extra namecard slot costs <span className="font-semibold text-gray-700">${SLOT_PRICE}</span>.
          Card slots are one-time purchases and do not expire.
        </p>

        {/* Quantity selector */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Quantity</p>
            <p className="text-xs text-gray-500">${SLOT_PRICE} × {qty} = <span className="font-semibold text-gray-800">${SLOT_PRICE * qty}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-lg font-bold text-gray-900">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(qty + 1)}
              className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={purchasing}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Purchase {qty} Slot{qty > 1 ? "s" : ""} — ${SLOT_PRICE * qty}
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-600">About Card Slots</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Every account includes <span className="font-medium text-gray-700">1 free</span> namecard slot.</li>
          <li>Additional slots can be purchased at <span className="font-medium text-gray-700">${SLOT_PRICE} each</span>.</li>
          <li>Card slots are <span className="font-medium text-gray-700">permanent</span> — they do not expire or renew.</li>
          <li>Each slot allows you to create one additional digital namecard.</li>
        </ul>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
