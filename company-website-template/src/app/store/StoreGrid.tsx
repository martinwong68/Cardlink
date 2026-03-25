"use client";

import type { StoreProduct } from "@/lib/cardlink-api";
import { useCart } from "@/lib/cart-context";

type Props = {
  products: StoreProduct[];
  primaryColor: string;
};

export default function StoreGrid({ products, primaryColor }: Props) {
  const { addItem } = useCart();

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl">🛍️</span>
        <p className="mt-4 text-gray-500">No products available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <div key={product.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition group">
          {Array.isArray(product.images) && product.images.length > 0 ? (
            <div className="aspect-square bg-gray-50 overflow-hidden">
              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          ) : (
            <div className="aspect-square bg-gray-50 flex items-center justify-center">
              <span className="text-4xl text-gray-300">📦</span>
            </div>
          )}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            {product.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: primaryColor }}>${Number(product.price).toFixed(2)}</span>
                {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                  <span className="text-sm text-gray-400 line-through">${Number(product.compare_at_price).toFixed(2)}</span>
                )}
              </div>
              <button
                onClick={() => addItem(product)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Add to Cart
              </button>
            </div>
            <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">{product.product_type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
