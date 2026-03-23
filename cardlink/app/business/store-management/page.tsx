"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Store,
  Settings as SettingsIcon,
  FolderOpen,
  Package,
  Tag,
  Truck,
  ChevronRight,
  Loader2,
  ClipboardList,
  Users,
  Ticket,
} from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";
import StorePreview from "@/components/business/StorePreview";

type StoreSettings = {
  store_name: string | null;
  banner_url: string | null;
  is_published: boolean;
  theme_color: string;
};

export default function StoreManagementPage() {
  const t = useTranslations("storeManagement");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [discountCount, setDiscountCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const [settingsRes, productsRes, categoriesRes, discountsRes] = await Promise.all([
        supabase.from("store_settings").select("store_name, banner_url, is_published, theme_color").eq("company_id", companyId).maybeSingle(),
        supabase.from("store_products").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        supabase.from("store_categories").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        supabase.from("store_discounts").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
      ]);

      if (settingsRes.data) setStoreSettings(settingsRes.data as StoreSettings);
      setProductCount(productsRes.count ?? 0);
      setCategoryCount(categoriesRes.count ?? 0);
      setDiscountCount(discountsRes.count ?? 0);
    } catch {
      // Tables may not exist yet — show empty state
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

  const togglePublish = async () => {
    if (!companyId) return;
    setPublishing(true);
    const newValue = !storeSettings?.is_published;

    if (storeSettings) {
      await supabase.from("store_settings").update({ is_published: newValue, updated_at: new Date().toISOString() }).eq("company_id", companyId);
    } else {
      await supabase.from("store_settings").insert({ company_id: companyId, is_published: newValue });
    }

    setStoreSettings((prev) => prev ? { ...prev, is_published: newValue } : { store_name: null, banner_url: null, is_published: newValue, theme_color: "#6366f1" });
    setPublishing(false);
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const quickActions = [
    { key: "orders" as const, icon: ClipboardList, color: "bg-amber-50 text-amber-600", href: "/business/store/orders" },
    { key: "customers" as const, icon: Users, color: "bg-purple-50 text-purple-600", href: "/business/store/customers" },
    { key: "coupons" as const, icon: Ticket, color: "bg-rose-50 text-rose-600", href: "/business/store/coupons" },
    { key: "setup" as const, icon: SettingsIcon, color: "bg-indigo-50 text-indigo-600", href: "/business/store/setup" },
    { key: "categories" as const, icon: FolderOpen, color: "bg-teal-50 text-teal-600", href: "/business/store/categories" },
    { key: "products" as const, icon: Package, color: "bg-blue-50 text-blue-600", href: "/business/store/products" },
    { key: "discounts" as const, icon: Tag, color: "bg-green-50 text-green-600", href: "/business/store/discounts" },
    { key: "settings" as const, icon: Truck, color: "bg-orange-50 text-orange-600", href: "/business/store/settings" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* Store Preview Card */}
      <div className="app-card overflow-hidden rounded-2xl">
        {storeSettings?.banner_url ? (
          <div className="relative h-32 w-full bg-gray-100">
            <img src={storeSettings.banner_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <p className="text-base font-semibold text-white">{storeSettings.store_name || t("title")}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${storeSettings.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {storeSettings.is_published ? t("published") : t("draft")}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Store className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{storeSettings?.store_name || t("title")}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${storeSettings?.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {storeSettings?.is_published ? t("published") : t("draft")}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("stats.products"), value: productCount },
          { label: t("stats.categories"), value: categoryCount },
          { label: t("stats.discounts"), value: discountCount },
        ].map((stat) => (
          <div key={stat.label} className="app-card flex flex-col items-center py-3 px-2 text-center">
            <p className="text-lg font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.key}
              href={action.href}
              className="app-card group flex items-center gap-3 px-4 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{t(`quickActions.${action.key}`)}</p>
                <p className="text-xs text-gray-400 truncate">{t(`quickActions.${action.key}Desc`)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition" />
            </Link>
          );
        })}
      </div>

      {/* Publish Toggle */}
      <button
        onClick={togglePublish}
        disabled={publishing}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
          storeSettings?.is_published
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50`}
      >
        {publishing ? t("publishing") : storeSettings?.is_published ? t("unpublishStore") : t("publishStore")}
      </button>

      {/* Store Preview */}
      {companyId && <StorePreview companyId={companyId} />}
    </div>
  );
}
