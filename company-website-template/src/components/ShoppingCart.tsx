"use client";

import { useState } from "react";
import type { StoreProduct, CheckoutPayload } from "@/lib/cardlink-api";
import { submitCheckout } from "@/lib/cardlink-api";

type CartItem = {
  product: StoreProduct;
  qty: number;
};

export default function ShoppingCart({ primaryColor }: { primaryColor: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderResult, setOrderResult] = useState<{ order_number?: string; total?: number } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const addItem = (product: StoreProduct) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product, qty: 1 }];
    });
    setOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
  };

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);

  const handleCheckout = async () => {
    if (items.length === 0 || !form.name) return;
    setCheckingOut(true);
    const payload: CheckoutPayload = {
      line_items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
      customer_name: form.name,
      customer_email: form.email || undefined,
      customer_phone: form.phone || undefined,
    };
    const result = await submitCheckout(payload);
    if (result.order) {
      setOrderResult(result.order);
      setItems([]);
    }
    setCheckingOut(false);
  };

  // Expose addItem globally so store page can call it
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__cartAddItem = addItem;
  }

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-lg hover:shadow-xl transition"
        style={{ backgroundColor: primaryColor }}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {totalItems > 0 && <span className="font-semibold">{totalItems}</span>}
      </button>

      {/* Cart panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {orderResult ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Placed!</h3>
                  <p className="mt-2 text-sm text-gray-500">Order #{orderResult.order_number}</p>
                  <p className="text-sm text-gray-500">Total: ${orderResult.total?.toFixed(2)}</p>
                  <button
                    onClick={() => { setOrderResult(null); setOpen(false); }}
                    className="mt-4 text-sm font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Your cart is empty.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 border-b border-gray-100 pb-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-xs text-gray-500">${Number(item.product.price).toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="h-7 w-7 rounded border text-sm">−</button>
                          <span className="text-sm w-6 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="h-7 w-7 rounded border text-sm">+</button>
                        </div>
                        <p className="text-sm font-semibold w-16 text-right">${(Number(item.product.price) * item.qty).toFixed(2)}</p>
                        <button onClick={() => removeItem(item.product.id)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <input
                      type="text"
                      placeholder="Your name *"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || !form.name}
                    className="mt-4 w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50 transition"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {checkingOut ? "Placing Order..." : `Checkout — $${subtotal.toFixed(2)}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
