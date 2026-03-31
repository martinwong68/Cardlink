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
  Globe,
  Palette,
  Shield,
  CreditCard,
  BarChart3,
  Bell,
  FileText,
  Megaphone,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
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
  const [orderCount, setOrderCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const [settingsRes, productsRes, categoriesRes, discountsRes, ordersRes, customersRes] = await Promise.all([
        supabase.from("store_settings").select("store_name, banner_url, is_published, theme_color").eq("company_id", companyId).maybeSingle(),
        supabase.from("store_products").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        supabase.from("store_categories").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        supabase.from("store_discounts").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("store_customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);

      if (settingsRes.data) setStoreSettings(settingsRes.data as StoreSettings);
      setProductCount(productsRes.count ?? 0);
      setCategoryCount(categoriesRes.count ?? 0);
      setDiscountCount(discountsRes.count ?? 0);
      setOrderCount(ordersRes.count ?? 0);
      setCustomerCount(customersRes.count ?? 0);
    } catch {
      // Tables may not exist yet
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

  const isPublished = storeSettings?.is_published ?? false;

  /* ── Readiness checks ── */
  const readinessChecks = [
    { label: "Store name set", done: !!storeSettings?.store_name },
    { label: "Banner uploaded", done: !!storeSettings?.banner_url },
    { label: "Products added", done: productCount > 0 },
    { label: "Categories created", done: categoryCount > 0 },
    { label: "Store published", done: isPublished },
  ];
  const readinessScore = Math.round((readinessChecks.filter((c) => c.done).length / readinessChecks.length) * 100);

  /* ── Management sections ── */
  const catalogSection = [
    { label: "Products", desc: "Manage store products, pricing & images", icon: Package, color: "bg-blue-50 text-blue-600", href: "/business/store/products", count: productCount },
    { label: "Categories", desc: "Organize products into categories", icon: FolderOpen, color: "bg-teal-50 text-teal-600", href: "/business/store/categories", count: categoryCount },
    { label: "Discounts", desc: "Create & manage discount rules", icon: Tag, color: "bg-green-50 text-green-600", href: "/business/store/discounts", count: discountCount },
    { label: "Coupons", desc: "Generate promo codes for customers", icon: Ticket, color: "bg-rose-50 text-rose-600", href: "/business/store/coupons" },
  ];

  const operationsSection = [
    { label: "Orders", desc: "View & manage customer orders", icon: ClipboardList, color: "bg-amber-50 text-amber-600", href: "/business/store/orders", count: orderCount },
    { label: "Customers", desc: "Customer database & profiles", icon: Users, color: "bg-purple-50 text-purple-600", href: "/business/store/customers", count: customerCount },
    { label: "Customer Accounts", desc: "Manage customer login accounts", icon: Shield, color: "bg-indigo-50 text-indigo-600", href: "/business/store/customer-accounts" },
    { label: "Shipments", desc: "Track & manage deliveries", icon: Truck, color: "bg-orange-50 text-orange-600", href: "/business/store/shipments" },
  ];

  const settingsSection = [
    { label: "Store Setup", desc: "Name, banner, branding & SEO", icon: Palette, color: "bg-pink-50 text-pink-600", href: "/business/store/setup" },
    { label: "Shipping & Tax", desc: "Shipping zones, rates & tax rules", icon: SettingsIcon, color: "bg-gray-50 text-gray-600", href: "/business/store/settings" },
  ];

  const renderSection = (title: string, items: typeof catalogSection) => (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="app-card group flex items-center gap-3 px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  {"count" in item && typeof item.count === "number" && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{item.count}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Store Management</h1>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Control panel for your online store — manage products, orders, customers &amp; settings</p>
      </div>

      {/* Store Status Card */}
      <div className={`app-card overflow-hidden rounded-2xl ${isPublished ? "border-green-200" : "border-amber-200"}`}>
        {storeSettings?.banner_url ? (
          <div className="relative h-28 w-full bg-gray-100">
            <img src={storeSettings.banner_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-base font-semibold text-white">{storeSettings.store_name || "My Store"}</p>
                <p className="text-[10px] text-white/70">
                  {productCount} products · {categoryCount} categories · {orderCount} orders
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {isPublished ? "Live" : "Draft"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPublished ? "bg-green-50" : "bg-amber-50"}`}>
                <Store className={`h-5 w-5 ${isPublished ? "text-green-600" : "text-amber-600"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{storeSettings?.store_name || "My Store"}</p>
                <p className="text-[10px] text-gray-400">
                  {productCount} products · {categoryCount} categories · {orderCount} orders
                </p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {isPublished ? "Live" : "Draft"}
            </span>
          </div>
        )}
      </div>

      {/* Publish/Unpublish Toggle */}
      <button
        onClick={() => void togglePublish()}
        disabled={publishing}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
          isPublished
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50`}
      >
        {isPublished ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {publishing ? "Processing..." : isPublished ? "Unpublish Store" : "Publish Store"}
      </button>

      {/* View Live Store Link */}
      {isPublished && companyId && (
        <a
          href={`/store/${companyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
        >
          <Globe className="h-4 w-4" /> View Live Store
        </a>
      )}

      {/* Store Readiness */}
      {readinessScore < 100 && (
        <div className="app-card p-4 border-l-4 border-amber-400">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">Store Readiness</span>
            </div>
            <span className={`text-sm font-bold ${readinessScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {readinessScore}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${readinessScore >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${readinessScore}%` }} />
          </div>
          <div className="space-y-1.5">
            {readinessChecks.filter((c) => !c.done).map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Management Sections */}
      {renderSection("Catalog", catalogSection)}
      {renderSection("Operations", operationsSection)}
      {renderSection("Settings", settingsSection)}

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/business/store" className="flex-1 app-secondary-btn flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold">
          <BarChart3 className="h-3.5 w-3.5" /> Store Dashboard
        </Link>
        <Link href="/business/items" className="flex-1 app-secondary-btn flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold">
          <Package className="h-3.5 w-3.5" /> Item Master
        </Link>
      </div>

      {/* Store Preview */}
      {companyId && <StorePreview companyId={companyId} />}
    </div>
  );
}
