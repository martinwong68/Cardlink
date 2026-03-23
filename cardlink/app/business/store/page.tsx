"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Store,
  Package,
  FolderOpen,
  Tag,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Box,
  Layers,
  DollarSign,
} from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type StoreSettings = {
  store_name: string | null;
  banner_url: string | null;
  is_published: boolean;
  theme_color: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  product_type: string;
  stock_quantity: number | null;
  is_active: boolean;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type DiscountRow = {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export default function BusinessStorePage() {
  const t = useTranslations("businessStore");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const [settingsRes, productsRes, categoriesRes, discountsRes] = await Promise.all([
        supabase.from("store_settings").select("store_name, banner_url, is_published, theme_color").eq("company_id", companyId).maybeSingle(),
        supabase.from("store_products").select("id, name, price, compare_at_price, product_type, stock_quantity, is_active, category_id").eq("company_id", companyId),
        supabase.from("store_categories").select("id, name, is_active").eq("company_id", companyId),
        supabase.from("store_discounts").select("id, name, discount_type, discount_value, is_active, start_date, end_date").eq("company_id", companyId),
      ]);

      if (settingsRes.data) setStoreSettings(settingsRes.data as StoreSettings);
      setProducts((productsRes.data as ProductRow[]) ?? []);
      setCategories((categoriesRes.data as CategoryRow[]) ?? []);
      setDiscounts((discountsRes.data as DiscountRow[]) ?? []);
    } catch {
      // Tables may not exist yet — show empty state
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ── Derived metrics ── */
  const activeProducts = products.filter((p) => p.is_active);
  const inactiveProducts = products.filter((p) => !p.is_active);
  const physicalProducts = activeProducts.filter((p) => p.product_type === "physical");
  const serviceProducts = activeProducts.filter((p) => p.product_type === "service");
  const digitalProducts = activeProducts.filter((p) => p.product_type === "digital");

  const prices = activeProducts.map((p) => p.price).filter((p) => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const totalCatalogValue = activeProducts.reduce((sum, p) => sum + p.price * (p.stock_quantity ?? 1), 0);

  const lowStockProducts = physicalProducts.filter((p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5);
  const outOfStockProducts = physicalProducts.filter((p) => (p.stock_quantity ?? 0) === 0);
  const inStockProducts = physicalProducts.filter((p) => (p.stock_quantity ?? 0) > 5);

  const activeCategories = categories.filter((c) => c.is_active);
  const categoryDistribution = activeCategories.map((cat) => ({
    name: cat.name,
    count: activeProducts.filter((p) => p.category_id === cat.id).length,
  })).sort((a, b) => b.count - a.count);
  const uncategorizedCount = activeProducts.filter((p) => !p.category_id).length;

  const now = new Date();
  const activeDiscounts = discounts.filter((d) => d.is_active && (!d.end_date || new Date(d.end_date) > now));
  const expiredDiscounts = discounts.filter((d) => d.end_date && new Date(d.end_date) <= now);
  const scheduledDiscounts = discounts.filter((d) => d.start_date && new Date(d.start_date) > now);

  const productsWithDiscount = activeProducts.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
  const avgDiscount = productsWithDiscount.length > 0
    ? productsWithDiscount.reduce((sum, p) => sum + ((1 - p.price / (p.compare_at_price ?? p.price)) * 100), 0) / productsWithDiscount.length
    : 0;

  /* ── Store readiness score ── */
  const readinessChecks = [
    { key: "hasName", done: !!storeSettings?.store_name },
    { key: "hasBanner", done: !!storeSettings?.banner_url },
    { key: "hasProducts", done: activeProducts.length > 0 },
    { key: "hasCategories", done: activeCategories.length > 0 },
    { key: "isPublished", done: !!storeSettings?.is_published },
  ];
  const readinessScore = Math.round((readinessChecks.filter((c) => c.done).length / readinessChecks.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("dashboard.subtitle")}</p>
      </div>

      {/* Store Status Banner */}
      <div className={`app-card overflow-hidden rounded-2xl p-4 ${storeSettings?.is_published ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${storeSettings?.is_published ? "bg-green-100" : "bg-amber-100"}`}>
              <Store className={`h-5 w-5 ${storeSettings?.is_published ? "text-green-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{storeSettings?.store_name || t("title")}</p>
              <p className={`text-xs font-medium ${storeSettings?.is_published ? "text-green-600" : "text-amber-600"}`}>
                {storeSettings?.is_published ? t("published") : t("draft")}
              </p>
            </div>
          </div>
          <Link href="/business/store-management" className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
            {t("dashboard.manage")}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">{t("dashboard.totalProducts")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeProducts.length}</p>
          {inactiveProducts.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{t("dashboard.inactive", { count: inactiveProducts.length })}</p>
          )}
        </div>
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500">{t("dashboard.avgPrice")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">${avgPrice.toFixed(2)}</p>
          {prices.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}</p>
          )}
        </div>
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-teal-500" />
            <span className="text-xs font-medium text-gray-500">{t("dashboard.categories")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeCategories.length}</p>
          {uncategorizedCount > 0 && (
            <p className="text-[10px] text-amber-500 mt-0.5">{t("dashboard.uncategorized", { count: uncategorizedCount })}</p>
          )}
        </div>
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-500">{t("dashboard.activeDiscounts")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeDiscounts.length}</p>
          {scheduledDiscounts.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{t("dashboard.scheduled", { count: scheduledDiscounts.length })}</p>
          )}
        </div>
      </div>

      {/* Catalog Value */}
      <div className="app-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">{t("dashboard.catalogValue")}</span>
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-800">${totalCatalogValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-xs text-gray-400 mt-1">{t("dashboard.catalogValueDesc")}</p>
      </div>

      {/* Product Type Breakdown */}
      <div className="app-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">{t("dashboard.productMix")}</span>
        </div>
        <div className="space-y-3">
          {[
            { label: t("dashboard.physical"), count: physicalProducts.length, color: "bg-blue-500", total: activeProducts.length },
            { label: t("dashboard.services"), count: serviceProducts.length, color: "bg-teal-500", total: activeProducts.length },
            { label: t("dashboard.digital"), count: digitalProducts.length, color: "bg-purple-500", total: activeProducts.length },
          ].map((item) => {
            const pct = item.total > 0 ? (item.count / item.total) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Health */}
      <div className="app-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Box className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">{t("dashboard.inventoryHealth")}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-lg font-bold text-green-700">{inStockProducts.length}</p>
            <p className="text-[10px] text-green-600">{t("dashboard.inStock")}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-lg font-bold text-amber-700">{lowStockProducts.length}</p>
            <p className="text-[10px] text-amber-600">{t("dashboard.lowStock")}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-center">
            <p className="text-lg font-bold text-red-700">{outOfStockProducts.length}</p>
            <p className="text-[10px] text-red-600">{t("dashboard.outOfStock")}</p>
          </div>
        </div>
        {lowStockProducts.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {t("dashboard.lowStockItems")}
            </p>
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50/50 px-3 py-1.5">
                <span className="text-xs text-gray-700 truncate">{p.name}</span>
                <span className="text-xs font-medium text-amber-600">{p.stock_quantity} {t("dashboard.left")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Distribution */}
      {categoryDistribution.length > 0 && (
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">{t("dashboard.categoryDistribution")}</span>
          </div>
          <div className="space-y-2">
            {categoryDistribution.map((cat) => {
              const pct = activeProducts.length > 0 ? (cat.count / activeProducts.length) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {uncategorizedCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-400">{t("dashboard.uncategorizedLabel")}</span>
                  <span className="text-xs text-gray-400">{uncategorizedCount}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gray-300 transition-all" style={{ width: `${activeProducts.length > 0 ? (uncategorizedCount / activeProducts.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discount Summary */}
      {discounts.length > 0 && (
        <div className="app-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">{t("dashboard.discountSummary")}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-xl bg-green-50 p-3 text-center">
              <p className="text-lg font-bold text-green-700">{activeDiscounts.length}</p>
              <p className="text-[10px] text-green-600">{t("dashboard.active")}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{scheduledDiscounts.length}</p>
              <p className="text-[10px] text-blue-600">{t("dashboard.scheduledLabel")}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-500">{expiredDiscounts.length}</p>
              <p className="text-[10px] text-gray-400">{t("dashboard.expired")}</p>
            </div>
          </div>
          {productsWithDiscount.length > 0 && (
            <p className="text-xs text-gray-500">
              {t("dashboard.discountedProducts", { count: productsWithDiscount.length, avg: avgDiscount.toFixed(0) })}
            </p>
          )}
        </div>
      )}

      {/* Store Readiness */}
      <div className="app-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">{t("dashboard.storeReadiness")}</span>
          </div>
          <span className={`text-sm font-bold ${readinessScore === 100 ? "text-green-600" : readinessScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
            {readinessScore}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${readinessScore === 100 ? "bg-green-500" : readinessScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${readinessScore}%` }}
          />
        </div>
        <div className="space-y-2">
          {readinessChecks.map((check) => (
            <div key={check.key} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${check.done ? "bg-green-100" : "bg-gray-100"}`}>
                {check.done ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={`text-xs ${check.done ? "text-gray-700" : "text-gray-400"}`}>{t(`dashboard.readiness.${check.key}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
