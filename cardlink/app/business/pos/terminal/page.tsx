"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Product = { id: string; name: string; sku: string | null; price: number; cost?: number; stock: number; is_active: boolean; inv_product_id?: string | null };
type CartItem = { productId: string; name: string; price: number; cost?: number; quantity: number; inv_product_id?: string | null };
type TaxConfig = { id: string; name: string; rate: number; is_default: boolean };
type Discount = { id: string; name: string; discount_type: "percentage" | "fixed"; value: number; min_order: number; is_active: boolean };
type MemberAccount = { id: string; user_id: string; email: string | null; full_name: string | null; status: string; tier_name: string | null; points_balance: number };
type MemberOffer = { id: string; title: string; description: string | null; offer_type: string; discount_type: string | null; discount_value: number; points_cost: number };
type QrCodeEntry = { label: string; image_url: string };

/** Fallback tax rate when no tax config is defined */
const DEFAULT_TAX_RATE = 0.08;

/** Points awarded per dollar spent — floor(total) gives 1 point per whole dollar */
const POINTS_PER_DOLLAR = 1;

export default function PosTerminalPage() {
  const { companyId, supabase } = useActiveCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "wallet" | "qr">("cash");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [noShift, setNoShift] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ receiptNumber: string; total: number; change: number; pointsAwarded?: number; memberName?: string; pending?: boolean } | null>(null);

  // Dynamic tax
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [selectedTaxId, setSelectedTaxId] = useState<string>("");

  // Discounts
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");

  // Customer
  const [customerName, setCustomerName] = useState("");

  // Cash tendered
  const [cashTendered, setCashTendered] = useState("");

  // Notes
  const [orderNotes, setOrderNotes] = useState("");

  // Member lookup
  const [memberSearch, setMemberSearch] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [linkedMember, setLinkedMember] = useState<MemberAccount | null>(null);

  // QR scanner for member lookup
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // QR code payment methods
  const [qrCodes, setQrCodes] = useState<QrCodeEntry[]>([]);
  const [selectedQrIndex, setSelectedQrIndex] = useState(0);

  // Membership offers (company_offers)
  const [memberOffers, setMemberOffers] = useState<MemberOffer[]>([]);
  const [selectedMemberOfferId, setSelectedMemberOfferId] = useState<string>("");

  // Applied redemption discount (from scanning a redemption QR)
  const [appliedRedemption, setAppliedRedemption] = useState<{
    redemption_id: string;
    offer_title: string;
    discount_type: string | null;
    discount_value: number;
  } | null>(null);

  // Prevent duplicate QR scans
  const scanProcessingRef = useRef(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [prodRes, shiftRes, taxRes, discRes] = await Promise.all([
        fetch("/api/pos/products", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/pos/shifts?status=open", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/pos/tax-config", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/pos/discounts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts((d.products ?? []).filter((p: Product) => p.is_active)); }
      if (shiftRes.ok) { const d = await shiftRes.json(); setNoShift(!d.shifts?.length); }
      if (taxRes.ok) {
        const d = await taxRes.json();
        const configs = d.tax_configs ?? [];
        setTaxConfigs(configs);
        const def = configs.find((t: TaxConfig) => t.is_default);
        if (def) setSelectedTaxId(def.id);
        else if (configs.length > 0) setSelectedTaxId(configs[0].id);
      }
      if (discRes.ok) {
        const d = await discRes.json();
        setDiscounts((d.discounts ?? []).filter((dc: Discount) => dc.is_active));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  // Load QR codes from store_settings
  const loadQrCodes = useCallback(async () => {
    if (!companyId || !supabase) return;
    const { data } = await supabase
      .from("store_settings")
      .select("payment_methods")
      .eq("company_id", companyId)
      .maybeSingle();
    if (data?.payment_methods) {
      const pm = data.payment_methods as Record<string, unknown>;
      setQrCodes(Array.isArray(pm.qr_codes) ? (pm.qr_codes as QrCodeEntry[]) : []);
    }
  }, [companyId, supabase]);

  useEffect(() => { load(); void loadQrCodes(); }, [load, loadQrCodes]);

  // Tax calculation
  const activeTax = taxConfigs.find((t) => t.id === selectedTaxId);
  const taxRate = activeTax ? Number(activeTax.rate) : DEFAULT_TAX_RATE;
  const taxLabel = activeTax ? activeTax.name : "Tax (8%)";

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // Discount calculation — considers store discounts, membership offers, and applied redemptions
  const activeDiscount = discounts.find((d) => d.id === selectedDiscountId);
  const activeMemberOffer = memberOffers.find((o) => o.id === selectedMemberOfferId);

  let discountAmount = 0;
  let discountLabel = "";

  if (appliedRedemption) {
    // Applied redemption takes priority
    if (appliedRedemption.discount_type === "percentage") {
      discountAmount = subtotal * (appliedRedemption.discount_value / 100);
    } else {
      discountAmount = Math.min(appliedRedemption.discount_value, subtotal);
    }
    discountLabel = `🎟 ${appliedRedemption.offer_title}`;
  } else if (activeMemberOffer && linkedMember) {
    // Membership offer discount
    if (activeMemberOffer.discount_type === "percentage") {
      discountAmount = subtotal * (activeMemberOffer.discount_value / 100);
    } else if (activeMemberOffer.discount_type === "fixed") {
      discountAmount = Math.min(activeMemberOffer.discount_value, subtotal);
    }
    discountLabel = `👑 ${activeMemberOffer.title}`;
  } else if (activeDiscount && subtotal >= activeDiscount.min_order) {
    // Store-level discount
    if (activeDiscount.discount_type === "percentage") {
      discountAmount = subtotal * (activeDiscount.value / 100);
    } else {
      discountAmount = Math.min(activeDiscount.value, subtotal);
    }
    discountLabel = activeDiscount.name;
  }

  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  // Cash change
  const cashTenderedNum = Number(cashTendered) || 0;
  const cashChange = payMethod === "cash" && cashTenderedNum > 0 ? cashTenderedNum - total : 0;

  const lookupMember = async (q: string) => {
    if (!q.trim()) return;
    setMemberLoading(true);
    try {
      const res = await fetch(`/api/pos/membership-lookup?q=${encodeURIComponent(q.trim())}`, {
        headers: { "x-cardlink-app-scope": "business" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const accts = json.accounts ?? [];
        if (accts.length > 0) {
          setLinkedMember(accts[0]);
          setCustomerName(accts[0].full_name || accts[0].email || "");
          // Fetch membership offers when member is linked
          void fetchMemberOffers();
        } else {
          setLinkedMember(null);
        }
      }
    } catch { /* silent */ } finally { setMemberLoading(false); }
  };

  const fetchMemberOffers = async () => {
    try {
      const res = await fetch("/api/pos/member-offers", {
        headers: { "x-cardlink-app-scope": "business" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setMemberOffers(json.offers ?? []);
      }
    } catch { /* silent */ }
  };

  /**
   * Parse a scanned QR code value:
   * - Namecard URL: /c/{slug}
   * - Redemption URL: /dashboard/scan?rid={uuid}
   * - Direct UUID: try as user_id
   * - Email: try as email
   */
  const handleQrScan = useCallback(async (text: string) => {
    if (scanProcessingRef.current) return; // prevent duplicate scans
    scanProcessingRef.current = true;
    stopScanner();
    const trimmed = text.trim();

    // Check if it's a redemption QR
    try {
      const parsed = new URL(trimmed);
      const rid = parsed.searchParams.get("rid");
      if (rid) {
        // This is a redemption QR - apply it
        await applyRedemptionQr(rid);
        scanProcessingRef.current = false;
        return;
      }
    } catch { /* not a URL or no rid param */ }

    // Otherwise treat as member lookup (handles /c/{slug}, UUID, email)
    setMemberSearch(trimmed);
    await lookupMember(trimmed);
    scanProcessingRef.current = false;
  }, []);

  const applyRedemptionQr = async (redemptionId: string) => {
    try {
      const res = await fetch("/api/pos/apply-redemption", {
        method: "POST",
        headers,
        body: JSON.stringify({ redemption_id: redemptionId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAppliedRedemption({
          redemption_id: json.redemption_id,
          offer_title: json.offer.title,
          discount_type: json.offer.discount_type,
          discount_value: json.offer.discount_value,
        });
        // Also link the member if we got a user_id
        if (json.member_user_id) {
          void lookupMember(json.member_user_id);
        }
      }
    } catch { /* silent */ }
  };

  const startScanner = useCallback(() => {
    setScannerActive(true);
  }, []);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScannerActive(false);
  }, []);

  // Initialize camera AFTER React renders the <video> element
  useEffect(() => {
    if (!scannerActive) return;
    let cancelled = false;
    const initCamera = async () => {
      // Small delay to ensure the video element is mounted in the DOM
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled || !videoRef.current) {
        if (!cancelled) setScannerActive(false);
        return;
      }
      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              void handleQrScan(result.getText());
            }
          }
        );
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch {
        if (!cancelled) setScannerActive(false);
      }
    };
    void initCamera();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [scannerActive, handleQrScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { controlsRef.current?.stop(); };
  }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, cost: p.cost ?? 0, quantity: 1, inv_product_id: p.inv_product_id }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }).filter((i) => i.quantity > 0));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (payMethod === "cash" && cashTenderedNum > 0 && cashTenderedNum < total) return; // insufficient cash
    setProcessing(true);
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const isPending = payMethod === "qr";
    const qrLabel = payMethod === "qr" && qrCodes[selectedQrIndex] ? qrCodes[selectedQrIndex].label : undefined;
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST", headers,
        body: JSON.stringify({
          receipt_number: receiptNumber,
          subtotal,
          tax_rate: taxRate,
          tax_amount: tax,
          total,
          discount_amount: discountAmount,
          discount_name: discountLabel || null,
          payment_method: payMethod === "qr" ? `qr:${qrLabel ?? "QR"}` : payMethod,
          status: isPending ? "pending" : "completed",
          customer_name: customerName.trim() || null,
          cash_tendered: payMethod === "cash" ? cashTenderedNum || null : null,
          cash_change: payMethod === "cash" ? Math.max(0, cashChange) : null,
          notes: orderNotes.trim() || null,
          line_items: cart.map((i) => ({
            productId: i.productId,
            inv_product_id: i.inv_product_id,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            cost: i.cost ?? 0,
            total: i.price * i.quantity,
          })),
        }),
      });
      if (res.ok) {
        // Award membership points if a member is linked
        let pointsAwarded: number | undefined;
        const memberName = linkedMember?.full_name || linkedMember?.email || undefined;
        if (linkedMember && linkedMember.status === "active") {
          const orderJson = await res.json().catch(() => null);
          const orderId = orderJson?.order?.id ?? receiptNumber;
          pointsAwarded = Math.floor(total * POINTS_PER_DOLLAR);
          void fetch("/api/pos/membership-award", {
            method: "POST",
            headers,
            body: JSON.stringify({
              account_id: linkedMember.id,
              order_id: orderId,
              amount: total,
              points: pointsAwarded,
            }),
          });
        }
        setOrderComplete({ receiptNumber, total, change: Math.max(0, cashChange), pointsAwarded, memberName, pending: isPending });
        setCart([]);
        setCustomerName("");
        setCashTendered("");
        setOrderNotes("");
        setSelectedDiscountId("");
        setSelectedMemberOfferId("");
        setAppliedRedemption(null);
        setMemberOffers([]);
        setLinkedMember(null);
        setMemberSearch("");
      }
    } catch { /* silent */ } finally { setProcessing(false); }
  };

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading terminal…</p></div>;

  // Order success screen
  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${orderComplete.pending ? "bg-amber-100" : "bg-emerald-100"}`}>
          <span className="text-3xl">{orderComplete.pending ? "⏳" : "✓"}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{orderComplete.pending ? "Order Pending Payment" : "Order Complete"}</h2>
        <p className="text-sm text-gray-500">{orderComplete.receiptNumber}</p>
        <p className="text-2xl font-bold text-gray-900">${orderComplete.total.toFixed(2)}</p>
        {orderComplete.pending && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-center space-y-1 max-w-xs">
            <p className="text-sm text-amber-700 font-semibold">Awaiting Payment Confirmation</p>
            <p className="text-xs text-amber-600">Customer is paying via QR code. Confirm payment in the Orders page once received.</p>
          </div>
        )}
        {orderComplete.change > 0 && (
          <div className="rounded-xl bg-amber-50 px-4 py-2 text-center">
            <p className="text-sm text-amber-700 font-semibold">Change Due: ${orderComplete.change.toFixed(2)}</p>
          </div>
        )}
        {orderComplete.pointsAwarded != null && orderComplete.pointsAwarded > 0 && (
          <div className="rounded-xl bg-indigo-50 px-4 py-2 text-center space-y-0.5">
            <p className="text-sm text-indigo-700 font-semibold">+{orderComplete.pointsAwarded} BOBO Points Awarded</p>
            {orderComplete.memberName && <p className="text-xs text-indigo-500">to {orderComplete.memberName}</p>}
          </div>
        )}
        <button onClick={() => setOrderComplete(null)} className="mt-4 rounded-xl bg-purple-600 px-8 py-3 text-sm font-bold text-white hover:bg-purple-700">
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">POS Terminal</h1>
      {noShift && <p className="text-xs text-amber-500">⚠ No active shift — orders will not be linked to a shift</p>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Product grid */}
        <div className="lg:col-span-3 space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name or SKU…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="rounded-xl border border-gray-100 bg-white p-3 text-left transition hover:bg-gray-50">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku ?? "No SKU"}</p>
                  <p className="text-base font-bold text-purple-600">${Number(p.price).toFixed(2)}</p>
                  <p className={`text-[10px] ${p.stock <= 5 ? "text-rose-500 font-semibold" : "text-gray-400"}`}>Stock: {p.stock}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No products found</p>
            </div>
          )}
        </div>

        {/* Cart & Checkout */}
        <div className="lg:col-span-2 space-y-3">
          {/* Cart items */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 text-base font-bold text-gray-900">Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)</h2>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">Tap products to add to cart</p>
            ) : (
              <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-1">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-gray-900">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button onClick={() => updateQty(item.productId, -1)} className="h-5 w-5 rounded bg-gray-100 text-xs font-bold text-gray-600">−</button>
                        <span className="text-xs font-semibold text-gray-700">{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, 1)} className="h-5 w-5 rounded bg-gray-100 text-xs font-bold text-gray-600">+</button>
                        <span className="text-[10px] text-gray-400">@ ${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.productId)} className="text-xs text-rose-500 hover:text-rose-700">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer (optional) */}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name (optional)" className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
            </div>

            {/* Member lookup with QR scanner */}
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void lookupMember(memberSearch); }}
                  placeholder="Member email, card slug, or scan QR…"
                  className="flex-1 rounded-lg border border-gray-100 px-3 py-1.5 text-xs"
                />
                <button onClick={() => void lookupMember(memberSearch)} disabled={memberLoading} className="rounded-lg bg-indigo-100 px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-50">
                  {memberLoading ? "…" : "🔍"}
                </button>
                <button
                  onClick={() => scannerActive ? stopScanner() : startScanner()}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${scannerActive ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                >
                  {scannerActive ? "⏹" : "📷"}
                </button>
              </div>

              {/* QR Scanner Camera */}
              {scannerActive && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <video ref={videoRef} className="w-full aspect-video object-cover" />
                  <p className="text-[10px] text-center text-gray-500 py-1">Scan member namecard or redemption QR…</p>
                </div>
              )}

              {linkedMember && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
                  <span className="text-xs font-semibold text-emerald-700">
                    ✓ {linkedMember.full_name || linkedMember.email} · {linkedMember.points_balance} pts
                    {linkedMember.tier_name ? ` · ${linkedMember.tier_name}` : ""}
                  </span>
                  <button onClick={() => { setLinkedMember(null); setMemberSearch(""); setMemberOffers([]); setSelectedMemberOfferId(""); setAppliedRedemption(null); }} className="ml-auto text-xs text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              {/* Applied redemption badge */}
              {appliedRedemption && (
                <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5">
                  <span className="text-xs font-semibold text-purple-700">
                    🎟 {appliedRedemption.offer_title} ({appliedRedemption.discount_type === "percentage" ? `${appliedRedemption.discount_value}%` : `$${appliedRedemption.discount_value}`} off)
                  </span>
                  <button onClick={() => setAppliedRedemption(null)} className="ml-auto text-xs text-red-500 hover:text-red-700">✕</button>
                </div>
              )}
            </div>

            {/* Membership offer selector (when member is linked) */}
            {linkedMember && memberOffers.length > 0 && !appliedRedemption && (
              <div className="mt-2">
                <label className="text-[10px] text-gray-500 font-semibold">👑 Membership Offers</label>
                <select
                  value={selectedMemberOfferId}
                  onChange={(e) => { setSelectedMemberOfferId(e.target.value); if (e.target.value) setSelectedDiscountId(""); }}
                  className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700"
                >
                  <option value="">No membership offer</option>
                  {memberOffers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.discount_type === "percentage" ? `${o.discount_value}%` : `$${o.discount_value}`} off{o.points_cost > 0 ? ` · ${o.points_cost} pts` : ""})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Store discount selector */}
            {discounts.length > 0 && !appliedRedemption && (
              <div className="mt-2">
                <label className="text-[10px] text-gray-500 font-semibold">🏷 Store Discounts</label>
                <select
                  value={selectedDiscountId}
                  onChange={(e) => { setSelectedDiscountId(e.target.value); if (e.target.value) setSelectedMemberOfferId(""); }}
                  className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-xs text-gray-700"
                >
                  <option value="">No discount</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.discount_type === "percentage" ? `${d.value}%` : `$${d.value}`}{d.min_order > 0 ? ` · min $${d.min_order}` : ""})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tax selector */}
            {taxConfigs.length > 0 && (
              <div className="mt-2">
                <select value={selectedTaxId} onChange={(e) => setSelectedTaxId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-xs text-gray-700">
                  {taxConfigs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Order notes */}
            <div className="mt-2">
              <input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Order notes (optional)" className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
            </div>

            {/* Totals */}
            <div className="space-y-1 border-t border-gray-100 pt-3 mt-3">
              <div className="flex justify-between"><span className="text-xs text-gray-500">Subtotal</span><span className="text-xs text-gray-900">${subtotal.toFixed(2)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between"><span className="text-xs text-emerald-600">Discount ({discountLabel})</span><span className="text-xs text-emerald-600">−${discountAmount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-xs text-gray-500">{taxLabel}</span><span className="text-xs text-gray-900">${tax.toFixed(2)}</span></div>
              <div className="flex justify-between pt-1"><span className="text-base font-bold text-gray-900">Total</span><span className="text-base font-bold text-gray-900">${total.toFixed(2)}</span></div>
            </div>

            {/* Payment method */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {(["cash", "card", "wallet"] as const).map((m) => (
                <button key={m} onClick={() => setPayMethod(m)} className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold capitalize ${payMethod === m ? "bg-purple-600 text-white" : "border border-gray-100 text-gray-600"}`}>{m}</button>
              ))}
              {qrCodes.length > 0 && (
                <button onClick={() => setPayMethod("qr")} className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold ${payMethod === "qr" ? "bg-purple-600 text-white" : "border border-gray-100 text-gray-600"}`}>QR Code</button>
              )}
            </div>

            {/* Cash tendered input */}
            {payMethod === "cash" && (
              <div className="mt-2 space-y-1">
                <input value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} type="number" placeholder="Cash tendered" className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-sm" />
                {cashTenderedNum > 0 && cashTenderedNum >= total && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-center">
                    <span className="text-sm font-bold text-emerald-700">Change: ${cashChange.toFixed(2)}</span>
                  </div>
                )}
                {cashTenderedNum > 0 && cashTenderedNum < total && (
                  <p className="text-xs text-rose-500 text-center">Insufficient cash</p>
                )}
              </div>
            )}

            {/* QR Code payment selector */}
            {payMethod === "qr" && qrCodes.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-amber-600 font-medium">⚠ QR orders require manual payment confirmation</p>
                <div className="space-y-2">
                  {qrCodes.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedQrIndex(i)}
                      className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition ${selectedQrIndex === i ? "bg-purple-50 border-2 border-purple-400" : "border border-gray-100 hover:bg-gray-50"}`}
                    >
                      <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0">
                        <img src={qr.image_url} alt={qr.label} className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{qr.label}</p>
                        <p className="text-[10px] text-gray-400">Show QR to customer</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleCheckout} disabled={cart.length === 0 || processing || (payMethod === "cash" && cashTenderedNum > 0 && cashTenderedNum < total)} className={`mt-3 w-full rounded-xl py-3 text-sm font-bold text-white ${cart.length === 0 || processing ? "bg-gray-300" : payMethod === "qr" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
              {processing ? "Processing…" : payMethod === "qr" ? `Create Pending Order $${total.toFixed(2)}` : `Charge $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
