"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type StoreSettings = {
  store_name: string | null;
  banner_url: string | null;
  theme_color: string;
};

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  images: string[];
  category_id: string | null;
  is_active: boolean;
};

type Discount = {
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applies_to: "all" | "category" | "product";
  target_id: string | null;
};

function getDiscountedPrice(product: Product, discounts: Discount[]): { discounted: boolean; finalPrice: number; originalPrice: number } {
  let bestDiscount = 0;
  for (const d of discounts) {
    let applies = false;
    if (d.applies_to === "all") applies = true;
    else if (d.applies_to === "category" && d.target_id === product.category_id) applies = true;
    else if (d.applies_to === "product" && d.target_id === product.id) applies = true;
    if (!applies) continue;
    const off = d.discount_type === "percentage" ? product.price * d.discount_value / 100 : d.discount_value;
    if (off > bestDiscount) bestDiscount = off;
  }
  const finalPrice = Math.max(0, product.price - bestDiscount);
  return { discounted: bestDiscount > 0, finalPrice, originalPrice: product.price };
}

export default function StorePreview({ companyId }: { companyId: string }) {
  const t = useTranslations("businessStore.preview");
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");

  const loadPreview = useCallback(async () => {
    const [settingsRes, catsRes, prodsRes, discRes] = await Promise.all([
      supabase.from("store_settings").select("store_name, banner_url, theme_color").eq("company_id", companyId).maybeSingle(),
      supabase.from("store_categories").select("id, name").eq("company_id", companyId).eq("is_active", true).order("sort_order"),
      supabase.from("store_products").select("id, name, price, compare_at_price, images, category_id, is_active").eq("company_id", companyId).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("store_discounts").select("discount_type, discount_value, applies_to, target_id").eq("company_id", companyId).eq("is_active", true),
    ]);

    if (settingsRes.data) setSettings(settingsRes.data as StoreSettings);
    setCategories((catsRes.data ?? []) as Category[]);
    setProducts(((prodsRes.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images : [],
    })) as Product[]);
    setDiscounts((discRes.data ?? []) as Discount[]);
  }, [companyId, supabase]);

  useEffect(() => { void loadPreview(); }, [loadPreview]);

  const filtered = filterCat === "all" ? products : products.filter((p) => p.category_id === filterCat);

  return (
    <div className="app-card overflow-hidden rounded-2xl">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("title")}</p>
      </div>

      {/* Banner */}
      {settings?.banner_url && (
        <div className="relative h-28 w-full bg-gray-100">
          <img src={settings.banner_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <p className="absolute bottom-2 left-3 text-sm font-semibold text-white">{settings.store_name || ""}</p>
        </div>
      )}

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-hide">
          <button
            onClick={() => setFilterCat("all")}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${filterCat === "all" ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={filterCat === "all" ? { backgroundColor: settings?.theme_color || "#6366f1" } : undefined}
          >
            {t("allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${filterCat === c.id ? "text-white" : "bg-gray-100 text-gray-600"}`}
              style={filterCat === c.id ? { backgroundColor: settings?.theme_color || "#6366f1" } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <Package className="h-6 w-6 text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">{t("noProducts")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3">
          {filtered.map((p) => {
            const { discounted, finalPrice, originalPrice } = getDiscountedPrice(p, discounts);
            return (
              <div key={p.id} className="rounded-xl bg-gray-50 overflow-hidden">
                {/* Image */}
                <div className="h-24 w-full bg-gray-100">
                  {p.images.length > 0 ? (
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-gray-200" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: settings?.theme_color || "#6366f1" }}>
                      ${finalPrice.toFixed(2)}
                    </span>
                    {discounted && (
                      <span className="text-[10px] text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
