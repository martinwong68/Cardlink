"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Loader2, Minus, Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/src/lib/supabase/client";

type ProfileData = {
  plan?: string | null;
  premium_until?: string | null;
  purchased_card_slots?: number | null;
};

const SLOT_PRICE_MONTHLY = 8; // dollars per slot per month

export default function CardSlotsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [purchasedSlots, setPurchasedSlots] = useState(0);
  const [usedSlots, setUsedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
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

  // Handle subscription success redirect
  useEffect(() => {
    if (searchParams.get("card_slot") !== "success") return;

    const purchasedQty = Math.max(1, Number(searchParams.get("qty")) || 1);

    const updateSlots = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Increment slots by the purchased quantity
      let newTotal = purchasedSlots;
      for (let i = 0; i < purchasedQty; i++) {
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
          newTotal = currentSlots + (purchasedQty - i);
          await supabase
            .from("profiles")
            .update({ purchased_card_slots: newTotal })
            .eq("id", userData.user.id);
          break;
        } else {
          newTotal = typeof updated === "number" ? updated : newTotal + 1;
        }
      }
      setPurchasedSlots(newTotal);
      setMessage({ type: "success", text: `${purchasedQty} card slot${purchasedQty > 1 ? "s" : ""} subscribed successfully!` });

      // Clean URL
      router.replace("/dashboard/settings/card-slots", { scroll: false });
    };
    void updateSlots();
  }, [searchParams, supabase, router, purchasedSlots]);

  const handleSubscribe = async () => {
    setMessage(null);
    setPurchasing(true);
    try {
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "subscription",
          planSlug: "__card_slot__",
          cardSlotQty: qty,
          successUrl: `${origin}/dashboard/settings/card-slots?card_slot=success&qty=${qty}`,
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

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = (await response.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      setMessage({ type: "error", text: "Failed to open billing portal." });
    } catch {
      setMessage({ type: "error", text: "Failed to open billing portal." });
    }
    setManagingBilling(false);
  };

  const handleRemoveSlot = async () => {
    if (purchasedSlots <= 0) return;
    if (usedSlots > totalSlots - 1) {
      setMessage({ type: "error", text: "Cannot remove slot — all slots are in use. Delete a card first." });
      return;
    }
    setMessage(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const newCount = Math.max(0, purchasedSlots - 1);
      await supabase
        .from("profiles")
        .update({ purchased_card_slots: newCount })
        .eq("id", userData.user.id);
      setPurchasedSlots(newCount);
      setMessage({ type: "success", text: "Slot removed. Update your subscription via Manage Billing to reflect the change." });
    } catch {
      setMessage({ type: "error", text: "Failed to remove slot." });
    }
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
          <p className="text-xs text-gray-500">Manage your namecard slot subscriptions</p>
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
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider">Subscribed</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalSlots}</p>
            <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
      </div>

      {/* Manage Existing Slots */}
      {purchasedSlots > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-700">Manage Subscription</h2>
          </div>
          <p className="text-xs text-gray-500">
            You have <span className="font-semibold text-gray-700">{purchasedSlots}</span> active card slot subscription{purchasedSlots > 1 ? "s" : ""} at <span className="font-semibold text-gray-700">${SLOT_PRICE_MONTHLY}/mo</span> each.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleManageBilling()}
              disabled={managingBilling}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {managingBilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage Billing
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveSlot()}
              disabled={purchasedSlots <= 0}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Remove Slot
            </button>
          </div>
        </div>
      )}

      {/* Subscribe Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700">Add Card Slots</h2>
        </div>

        <p className="text-xs text-gray-500">
          Each extra namecard slot costs <span className="font-semibold text-gray-700">${SLOT_PRICE_MONTHLY}/month</span>.
          Subscriptions can be managed or cancelled at any time via the billing portal.
        </p>

        {/* Quantity selector */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Quantity</p>
            <p className="text-xs text-gray-500">${SLOT_PRICE_MONTHLY}/mo × {qty} = <span className="font-semibold text-gray-800">${SLOT_PRICE_MONTHLY * qty}/mo</span></p>
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
          onClick={() => void handleSubscribe()}
          disabled={purchasing}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Subscribe {qty} Slot{qty > 1 ? "s" : ""} — ${SLOT_PRICE_MONTHLY * qty}/mo
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-600">About Card Slots</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Every account includes <span className="font-medium text-gray-700">1 free</span> namecard slot.</li>
          <li>Additional slots are <span className="font-medium text-gray-700">${SLOT_PRICE_MONTHLY}/month</span> each, billed monthly.</li>
          <li>You can <span className="font-medium text-gray-700">add or remove</span> slots at any time.</li>
          <li>Manage your payment method and invoices via <span className="font-medium text-gray-700">Manage Billing</span>.</li>
          <li>Cancelling removes the slot at the end of the billing period.</li>
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
