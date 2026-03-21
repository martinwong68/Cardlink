"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Store,
  Sparkles,
  Bell,
  Settings,
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Handshake,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

/* ── 5-section nav items ── */
const navItems = [
  { href: "/business", labelKey: "business" as const, icon: LayoutGrid },
  { href: "/business/store", labelKey: "store" as const, icon: Store },
  { href: "/business/ai", labelKey: "ai" as const, icon: Sparkles, center: true },
  { href: "/business/notifications", labelKey: "notifications" as const, icon: Bell },
  { href: "/business/settings", labelKey: "settings" as const, icon: Settings },
];

/* ── Module routes (used to detect active module state) ── */
const moduleItems = [
  { href: "/business/accounting", label: "Accounting", icon: BookOpen },
  { href: "/business/crm", label: "CRM", icon: Handshake },
  { href: "/business/pos", label: "POS", icon: ShoppingCart },
  { href: "/business/inventory", label: "Inventory", icon: Package },
  { href: "/business/procurement", label: "Procurement", icon: ClipboardList },
  { href: "/business/cards", label: "Cards", icon: CreditCard },
  { href: "/business/hr", label: "HR", icon: Users },
  { href: "/business/booking", label: "Booking", icon: Calendar },
];

export default function BusinessNav() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("businessNav");

  /* ── Pending AI action cards badge ── */
  const supabase = useMemo(() => createClient(), []);
  const [aiPendingCount, setAiPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_active_company_id")
      .eq("id", user.id)
      .single();
    const cid = profile?.business_active_company_id as string | null;
    if (!cid) return;
    const { count } = await supabase
      .from("ai_action_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid)
      .eq("status", "pending");
    setAiPendingCount(count ?? 0);
  }, [supabase]);

  useEffect(() => { void fetchPendingCount(); }, [fetchPendingCount]);

  const isActive = (href: string) => {
    if (href === "/business") {
      return pathname === "/business" || pathname === "/business/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isModuleRoute = moduleItems.some(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`)
  );

  /* Shared renderer for bottom nav items (mobile + desktop floating) */
  const renderNavItems = (keyPrefix: string) =>
    navItems.map((item) => {
      const active = item.center
        ? isActive(item.href)
        : isActive(item.href) && !isModuleRoute;
      const Icon = item.icon;

      if (item.center) {
        return (
          <Link
            key={`${keyPrefix}-${item.href}`}
            href={item.href}
            className="flex flex-col items-center gap-0.5 -mt-3"
          >
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
                active
                  ? "bg-indigo-600 ring-2 ring-indigo-300"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Icon className="h-5 w-5 text-white" />
              {aiPendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                  {aiPendingCount}
                </span>
              )}
            </span>
            <span
              className={`text-[10px] ${
                active ? "font-medium text-indigo-600" : "text-gray-400"
              }`}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      }

      return (
        <Link
          key={`${keyPrefix}-${item.href}`}
          href={item.href}
          className="flex flex-col items-center gap-0.5 px-2 py-1"
        >
          <Icon
            className={`h-[18px] w-[18px] ${
              active ? "text-indigo-600" : "text-gray-400"
            }`}
          />
          <span
            className={`text-[10px] ${
              active ? "font-medium text-indigo-600" : "text-gray-400"
            }`}
          >
            {t(item.labelKey)}
          </span>
        </Link>
      );
    });

  return (
    <>
      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-end justify-around">
          {renderNavItems("mob")}
        </div>
      </nav>

      {/* ── Desktop/Tablet Floating Bottom Nav ── */}
      <nav className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 md:flex">
        <div className="flex items-end justify-around gap-1 rounded-2xl border border-gray-200/60 bg-white/90 px-4 pt-2 pb-2 shadow-lg backdrop-blur-md w-[26rem]">
          {renderNavItems("desk")}
        </div>
      </nav>
    </>
  );
}
