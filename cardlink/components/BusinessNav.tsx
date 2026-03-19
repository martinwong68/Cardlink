"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Store,
  Sparkles,
  Bell,
  Settings,
  Zap,
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Handshake,
  ClipboardList,
  CreditCard,
} from "lucide-react";

/* ── 5-section nav items ── */
const navItems = [
  { href: "/business", labelKey: "business" as const, icon: LayoutGrid },
  { href: "/business/store", labelKey: "store" as const, icon: Store },
  { href: "/business/ai", labelKey: "ai" as const, icon: Sparkles, center: true },
  { href: "/business/notifications", labelKey: "notifications" as const, icon: Bell },
  { href: "/business/settings", labelKey: "settings" as const, icon: Settings },
];

/* ── Module sidebar items (desktop only, for quick access) ── */
const moduleItems = [
  { href: "/business/accounting", label: "Accounting", icon: BookOpen },
  { href: "/business/crm", label: "CRM", icon: Handshake },
  { href: "/business/pos", label: "POS", icon: ShoppingCart },
  { href: "/business/inventory", label: "Inventory", icon: Package },
  { href: "/business/procurement", label: "Procurement", icon: ClipboardList },
  { href: "/business/cards", label: "Cards", icon: CreditCard },
];

export default function BusinessNav({
  isMasterUser = false,
  activeCompanyName = null,
}: {
  isMasterUser?: boolean;
  activeCompanyName?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("businessNav");

  const isActive = (href: string) => {
    if (href === "/business") {
      return pathname === "/business" || pathname === "/business/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  /* Check if we're inside a module route (not one of the 5 main sections) */
  const isModuleRoute = moduleItems.some(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`)
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-52 md:flex-col md:rounded-2xl md:bg-gray-900 md:p-3 md:min-h-[28rem]">
        {/* Branding */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Cardlink</span>
        </div>

        {/* Company info */}
        <div className="mb-4 rounded-lg bg-gray-800 px-3 py-2">
          {isMasterUser ? (
            <p className="text-[10px] font-semibold text-amber-400">Master</p>
          ) : null}
          <p className="truncate text-xs text-gray-400">
            {activeCompanyName ?? "No company"}
          </p>
        </div>

        {/* Main 5-section nav */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href) && !isModuleRoute;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  item.center
                    ? active
                      ? "bg-indigo-600 text-white"
                      : "text-indigo-300 hover:bg-indigo-900/50 hover:text-indigo-200"
                    : active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.center && !active ? "text-indigo-400" : ""}`} />
                {t(item.labelKey)}
                {item.center && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/30 text-[8px] text-indigo-300">
                    ✦
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Module shortcuts */}
        <div className="mt-6 border-t border-gray-800 pt-3">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Modules
          </span>
          <div className="mt-2 space-y-0.5">
            {moduleItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-end justify-around">
          {navItems.map((item) => {
            const active = item.center
              ? isActive(item.href)
              : isActive(item.href) && !isModuleRoute;
            const Icon = item.icon;

            if (item.center) {
              /* AI button — FAB style, accent color, larger */
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-0.5 -mt-3"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
                      active
                        ? "bg-indigo-600 ring-2 ring-indigo-300"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" />
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
                key={item.href}
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
          })}
        </div>
      </nav>
    </>
  );
}
