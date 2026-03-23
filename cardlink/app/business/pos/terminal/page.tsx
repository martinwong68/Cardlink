"use client";

import { useEffect, useState, useCallback } from "react";

type Product = { id: string; name: string; sku: string | null; price: number; cost?: number; stock: number; is_active: boolean; inv_product_id?: string | null };
type CartItem = { productId: string; name: string; price: number; quantity: number; inv_product_id?: string | null };
type TaxConfig = { id: string; name: string; rate: number; is_default: boolean };
type Discount = { id: string; name: string; discount_type: "percentage" | "fixed"; value: number; min_order: number; is_active: boolean };

/** Fallback tax rate when no tax config is defined */
const DEFAULT_TAX_RATE = 0.08;

export default function PosTerminalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "wallet">("cash");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [noShift, setNoShift] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ receiptNumber: string; total: number; change: number } | null>(null);

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

  useEffect(() => { load(); }, [load]);

  // Tax calculation
  const activeTax = taxConfigs.find((t) => t.id === selectedTaxId);
  const taxRate = activeTax ? Number(activeTax.rate) : DEFAULT_TAX_RATE;
  const taxLabel = activeTax ? activeTax.name : "Tax (8%)";

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // Discount calculation
  const activeDiscount = discounts.find((d) => d.id === selectedDiscountId);
  let discountAmount = 0;
  if (activeDiscount && subtotal >= activeDiscount.min_order) {
    if (activeDiscount.discount_type === "percentage") {
      discountAmount = subtotal * (activeDiscount.value / 100);
    } else {
      discountAmount = Math.min(activeDiscount.value, subtotal);
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  // Cash change
  const cashTenderedNum = Number(cashTendered) || 0;
  const cashChange = payMethod === "cash" && cashTenderedNum > 0 ? cashTenderedNum - total : 0;

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1, inv_product_id: p.inv_product_id }];
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
          discount_name: activeDiscount?.name ?? null,
          payment_method: payMethod,
          status: "completed",
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
            total: i.price * i.quantity,
          })),
        }),
      });
      if (res.ok) {
        setOrderComplete({ receiptNumber, total, change: Math.max(0, cashChange) });
        setCart([]);
        setCustomerName("");
        setCashTendered("");
        setOrderNotes("");
        setSelectedDiscountId("");
      }
    } catch { /* silent */ } finally { setProcessing(false); }
  };

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading terminal…</p></div>;

  // Order success screen
  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Order Complete</h2>
        <p className="text-sm text-gray-500">{orderComplete.receiptNumber}</p>
        <p className="text-2xl font-bold text-gray-900">${orderComplete.total.toFixed(2)}</p>
        {orderComplete.change > 0 && (
          <div className="rounded-xl bg-amber-50 px-4 py-2 text-center">
            <p className="text-sm text-amber-700 font-semibold">Change Due: ${orderComplete.change.toFixed(2)}</p>
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

            {/* Discount selector */}
            {discounts.length > 0 && (
              <div className="mt-2">
                <select value={selectedDiscountId} onChange={(e) => setSelectedDiscountId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-1.5 text-xs text-gray-700">
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
                    <option key={t.id} value={t.id}>{t.name} ({(Number(t.rate) * 100).toFixed(1)}%)</option>
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
                <div className="flex justify-between"><span className="text-xs text-emerald-600">Discount ({activeDiscount?.name})</span><span className="text-xs text-emerald-600">−${discountAmount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-xs text-gray-500">{taxLabel} ({(taxRate * 100).toFixed(1)}%)</span><span className="text-xs text-gray-900">${tax.toFixed(2)}</span></div>
              <div className="flex justify-between pt-1"><span className="text-base font-bold text-gray-900">Total</span><span className="text-base font-bold text-gray-900">${total.toFixed(2)}</span></div>
            </div>

            {/* Payment method */}
            <div className="mt-3 flex gap-2">
              {(["cash", "card", "wallet"] as const).map((m) => (
                <button key={m} onClick={() => setPayMethod(m)} className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold capitalize ${payMethod === m ? "bg-purple-600 text-white" : "border border-gray-100 text-gray-600"}`}>{m}</button>
              ))}
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

            <button onClick={handleCheckout} disabled={cart.length === 0 || processing || (payMethod === "cash" && cashTenderedNum > 0 && cashTenderedNum < total)} className={`mt-3 w-full rounded-xl py-3 text-sm font-bold text-white ${cart.length === 0 || processing ? "bg-gray-300" : "bg-emerald-500 hover:bg-emerald-600"}`}>
              {processing ? "Processing…" : `Charge $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
