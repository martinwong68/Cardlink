"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ShoppingBag, Package, Loader2, X, Plus, Minus, ShoppingCart as CartIcon, CreditCard, QrCode, Banknote, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

/* ── Types ── */
type QrCodeEntry = { label: string; image_url: string };

type PaymentConfig = {
  stripe_enabled: boolean;
  cash_enabled: boolean;
  bank_transfer_enabled: boolean;
  qr_codes: QrCodeEntry[];
};

type StoreData = {
  store: {
    name: string;
    description: string | null;
    banner_url: string | null;
    theme_color: string;
  };
  categories: { id: string; name: string; slug: string; description: string | null; icon: string | null; sort_order: number }[];
  products: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    compare_at_price: number | null;
    product_type: string;
    images: string[];
    category_id: string | null;
    sku: string | null;
    stock_quantity: number | null;
  }[];
  payment_config: PaymentConfig;
};

type CartItem = { productId: string; name: string; price: number; qty: number; image: string | null };

type CheckoutStep = "cart" | "info" | "payment" | "qr-confirm" | "success";

export default function PublicStorePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [selectedQrCode, setSelectedQrCode] = useState<QrCodeEntry | null>(null);
  const [orderResult, setOrderResult] = useState<{ id: string; order_number: string; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/store/products?company_id=${companyId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Store not available" }));
        setError((body as { error?: string }).error || "Store not available");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as StoreData;
      setData(json);
    } catch {
      setError("Failed to load store.");
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) void loadStore();
  }, [companyId, loadStore]);

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setCheckoutStep("success");
      setShowCart(true);
    }
  }, [searchParams]);

  const addToCart = (product: StoreData["products"][0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, image: product.images?.[0] ?? null }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.productId === productId ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const primaryColor = data?.store.theme_color ?? "#6366f1";

  const paymentConfig = data?.payment_config ?? {
    stripe_enabled: false,
    cash_enabled: false,
    bank_transfer_enabled: false,
    qr_codes: [],
  };

  const hasAnyPayment = paymentConfig.stripe_enabled || paymentConfig.cash_enabled || paymentConfig.bank_transfer_enabled || paymentConfig.qr_codes.length > 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutError(null);
    setSubmitting(true);

    try {
      // Create the order
      const res = await fetch("/api/public/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          line_items: cart.map((c) => ({ product_id: c.productId, qty: c.qty })),
          customer_name: customerName.trim() || undefined,
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          shipping_address: shippingAddress.trim() ? { address: shippingAddress.trim() } : undefined,
          payment_method: selectedPayment === "stripe" ? "stripe" : selectedPayment === "qr" ? "qr_code" : selectedPayment,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setCheckoutError((errBody as { error?: string }).error ?? "Checkout failed.");
        setSubmitting(false);
        return;
      }

      const orderData = await res.json();
      const order = orderData.order as { id: string; order_number: string; total: number };
      setOrderResult(order);

      // If Stripe payment, redirect to Stripe Checkout
      if (selectedPayment === "stripe") {
        const stripeRes = await fetch("/api/public/store/stripe-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId,
            order_id: order.id,
          }),
        });

        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          if (stripeData.url) {
            window.location.href = stripeData.url;
            return;
          }
        } else {
          const errBody = await stripeRes.json().catch(() => ({}));
          setCheckoutError((errBody as { error?: string }).error ?? "Failed to start Stripe payment.");
          setSubmitting(false);
          return;
        }
      }

      // For QR code payments — show the QR code for the customer
      if (selectedPayment === "qr") {
        setCheckoutStep("qr-confirm");
        setSubmitting(false);
        return;
      }

      // For cash/bank transfer — just show success
      setCheckoutStep("success");
      setCart([]);
    } catch {
      setCheckoutError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500">Loading store…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <ShoppingBag className="h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-lg font-bold text-gray-800">Store Not Available</h1>
        <p className="mt-1 text-sm text-gray-500">{error || "This store is not published."}</p>
      </div>
    );
  }

  const filtered = filterCat === "all"
    ? data.products
    : data.products.filter((p) => p.category_id === filterCat);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      {data.store.banner_url ? (
        <div className="relative h-48 sm:h-64 bg-gray-200">
          <img src={data.store.banner_url} alt={data.store.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl font-bold">{data.store.name}</h1>
              {data.store.description && <p className="mt-2 text-lg opacity-90">{data.store.description}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-10 pb-4 text-center bg-gray-50">
          <h1 className="text-3xl font-bold text-gray-900">{data.store.name}</h1>
          {data.store.description && <p className="mt-2 text-gray-600">{data.store.description}</p>}
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Categories */}
        {data.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilterCat("all")}
              className="rounded-full px-4 py-1.5 text-sm font-medium border transition"
              style={filterCat === "all" ? { backgroundColor: primaryColor, color: "white", borderColor: primaryColor } : { borderColor: "#e5e7eb", color: "#374151" }}
            >
              All
            </button>
            {data.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(cat.id)}
                className="rounded-full px-4 py-1.5 text-sm font-medium border transition"
                style={filterCat === cat.id ? { backgroundColor: primaryColor, color: "white", borderColor: primaryColor } : { borderColor: "#e5e7eb", color: "#374151" }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 text-gray-200" />
                    </div>
                  )}
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold" style={{ color: primaryColor }}>${product.price.toFixed(2)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-xs text-gray-400 line-through">${product.compare_at_price.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart floating button */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => { setShowCart(true); setCheckoutStep("cart"); }}
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-lg transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <CartIcon className="h-5 w-5" />
          <span className="font-semibold">{cartCount}</span>
          <span className="text-sm">· ${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart / Checkout panel */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => { if (checkoutStep === "cart") setShowCart(false); }} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              {checkoutStep === "cart" && <h2 className="text-lg font-bold text-gray-900">Cart ({cartCount})</h2>}
              {checkoutStep === "info" && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setCheckoutStep("cart")} className="p-1 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-4 w-4" /></button>
                  <h2 className="text-lg font-bold text-gray-900">Your Details</h2>
                </div>
              )}
              {checkoutStep === "payment" && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setCheckoutStep("info")} className="p-1 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-4 w-4" /></button>
                  <h2 className="text-lg font-bold text-gray-900">Payment</h2>
                </div>
              )}
              {checkoutStep === "qr-confirm" && <h2 className="text-lg font-bold text-gray-900">Scan & Pay</h2>}
              {checkoutStep === "success" && <h2 className="text-lg font-bold text-gray-900">Order Placed!</h2>}
              <button onClick={() => { setShowCart(false); if (checkoutStep === "success") { setCart([]); setCheckoutStep("cart"); } }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Step: Cart */}
            {checkoutStep === "cart" && (
              <div className="flex-1 flex flex-col">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                    <CartIcon className="h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">Your cart is empty.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            {item.image ? (
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-gray-300" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateCartQty(item.productId, -1)} className="rounded-full border border-gray-200 p-1 hover:bg-gray-100">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.productId, 1)} className="rounded-full border border-gray-200 p-1 hover:bg-gray-100">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-gray-100 space-y-3 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-lg font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => setCheckoutStep("info")}
                        className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: Customer Info */}
            {checkoutStep === "info" && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+1234567890" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Shipping Address (optional)</label>
                    <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={2} placeholder="123 Main St, City" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 shrink-0">
                  <button
                    onClick={() => {
                      if (hasAnyPayment) {
                        setCheckoutStep("payment");
                      } else {
                        // No payment methods configured — place order directly
                        setSelectedPayment("cash");
                        void handleCheckout();
                      }
                    }}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {hasAnyPayment ? "Choose Payment Method" : "Place Order"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Payment Method Selection */}
            {checkoutStep === "payment" && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">Select how you'd like to pay:</p>

                  {/* Stripe */}
                  {paymentConfig.stripe_enabled && (
                    <button
                      onClick={() => { setSelectedPayment("stripe"); setSelectedQrCode(null); }}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition ${selectedPayment === "stripe" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <CreditCard className="h-5 w-5 text-indigo-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Pay with Card (Stripe)</p>
                        <p className="text-[10px] text-gray-500">Secure checkout via Stripe</p>
                      </div>
                    </button>
                  )}

                  {/* Cash */}
                  {paymentConfig.cash_enabled && (
                    <button
                      onClick={() => { setSelectedPayment("cash"); setSelectedQrCode(null); }}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition ${selectedPayment === "cash" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <Banknote className="h-5 w-5 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Cash on Delivery</p>
                        <p className="text-[10px] text-gray-500">Pay when you receive your order</p>
                      </div>
                    </button>
                  )}

                  {/* Bank Transfer */}
                  {paymentConfig.bank_transfer_enabled && (
                    <button
                      onClick={() => { setSelectedPayment("bank_transfer"); setSelectedQrCode(null); }}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition ${selectedPayment === "bank_transfer" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <Banknote className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Bank Transfer</p>
                        <p className="text-[10px] text-gray-500">Transfer to merchant bank account</p>
                      </div>
                    </button>
                  )}

                  {/* QR Codes */}
                  {paymentConfig.qr_codes.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedPayment("qr"); setSelectedQrCode(qr); }}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition ${selectedPayment === "qr" && selectedQrCode?.label === qr.label ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        <img src={qr.image_url} alt={qr.label} className="h-full w-full object-contain" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{qr.label}</p>
                        <p className="text-[10px] text-gray-500">Scan QR code to pay</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-100 space-y-2 shrink-0">
                  {checkoutError && <p className="text-xs text-red-600">{checkoutError}</p>}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => void handleCheckout()}
                    disabled={submitting || !selectedPayment}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {selectedPayment === "stripe" ? "Pay with Stripe" : "Place Order"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: QR Code Confirmation */}
            {checkoutStep === "qr-confirm" && selectedQrCode && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <QrCode className="h-8 w-8 text-indigo-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Scan to Pay</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Scan the QR code below with <strong>{selectedQrCode.label}</strong> and pay <strong>${orderResult?.total?.toFixed(2)}</strong>
                </p>
                <div className="my-6 rounded-2xl bg-white border-2 border-gray-200 p-3 shadow-sm">
                  <img src={selectedQrCode.image_url} alt={selectedQrCode.label} className="w-48 h-48 object-contain mx-auto" />
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Order #{orderResult?.order_number} · The merchant will confirm your payment manually.
                </p>
                <button
                  onClick={() => { setCheckoutStep("success"); setCart([]); }}
                  className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  I&apos;ve Made the Payment
                </button>
              </div>
            )}

            {/* Step: Success */}
            {checkoutStep === "success" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Order Placed!</h3>
                {orderResult && (
                  <p className="text-sm text-gray-500 mt-2">
                    Order <strong>#{orderResult.order_number}</strong> for <strong>${orderResult.total.toFixed(2)}</strong>
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {selectedPayment === "qr" ? "Your payment is pending confirmation by the merchant." :
                   selectedPayment === "cash" || selectedPayment === "bank_transfer" ? "Please complete your payment as agreed." :
                   "Your payment has been processed."}
                </p>
                <button
                  onClick={() => { setShowCart(false); setCheckoutStep("cart"); setOrderResult(null); }}
                  className="mt-6 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by <a href="/" className="font-medium text-indigo-500 hover:text-indigo-600">Cardlink</a>
        </p>
      </div>
    </div>
  );
}
