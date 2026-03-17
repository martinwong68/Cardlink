"use client";

import { useEffect, useState, useCallback } from "react";

type Product = { id: string; name: string; sku: string | null; price: number; stock: number; is_active: boolean };
type CartItem = { productId: string; name: string; price: number; quantity: number };

export default function PosTerminalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "wallet">("cash");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [noShift, setNoShift] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [prodRes, shiftRes] = await Promise.all([
        fetch("/api/pos/products", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/pos/shifts?status=open", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts((d.products ?? []).filter((p: Product) => p.is_active)); }
      if (shiftRes.ok) { const d = await shiftRes.json(); setNoShift(!d.shifts?.length); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/pos/orders", {
        method: "POST", headers,
        body: JSON.stringify({
          receipt_number: receiptNumber, subtotal, tax_amount: tax, total, discount_amount: 0, payment_method: payMethod, status: "completed",
          line_items: cart.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
        }),
      });
      setCart([]);
    } catch { /* silent */ } finally { setProcessing(false); }
  };

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading terminal…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">POS Terminal</h1>
      {noShift && <p className="text-xs text-amber-500">No active shift — orders will not be linked to a shift</p>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Product grid */}
        <div className="lg:col-span-3 space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="rounded-xl border border-gray-100 bg-white p-3 text-left transition hover:bg-gray-50">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku ?? "No SKU"}</p>
                  <p className="text-base font-bold text-purple-600">${Number(p.price).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">Stock: {p.stock}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No products</p>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-gray-900">Cart ({cart.length})</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Tap products to add to cart</p>
          ) : (
            <div className="mb-3 space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-1">
                  <div className="flex-1">
                    <p className="truncate text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">x{item.quantity} @ ${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-xs text-rose-500">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 border-t border-gray-100 pt-3">
            <div className="flex justify-between"><span className="text-xs text-gray-500">Subtotal</span><span className="text-xs text-gray-900">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Tax (8%)</span><span className="text-xs text-gray-900">${tax.toFixed(2)}</span></div>
            <div className="flex justify-between pt-1"><span className="text-base font-bold text-gray-900">Total</span><span className="text-base font-bold text-gray-900">${total.toFixed(2)}</span></div>
          </div>

          {/* Payment */}
          <div className="mt-3 flex gap-2">
            {(["cash", "card", "wallet"] as const).map((m) => (
              <button key={m} onClick={() => setPayMethod(m)} className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold capitalize ${payMethod === m ? "bg-purple-600 text-white" : "border border-gray-100 text-gray-600"}`}>{m}</button>
            ))}
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0 || processing} className={`mt-3 w-full rounded-xl py-3 text-sm font-bold text-white ${cart.length === 0 ? "bg-gray-300" : "bg-emerald-500 hover:bg-emerald-600"}`}>
            {processing ? "Processing…" : `Charge $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
