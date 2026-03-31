"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ShoppingBag, Package, Loader2, X, Plus, Minus, ShoppingCart as CartIcon } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

/* ── Types ── */
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
};

type CartItem = { productId: string; name: string; price: number; qty: number; image: string | null };

export default function PublicStorePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

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
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-lg transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <CartIcon className="h-5 w-5" />
          <span className="font-semibold">{cartCount}</span>
          <span className="text-sm">· ${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart panel */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CartIcon className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Your cart is empty.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
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

                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="text-lg font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
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
