"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Calculator,
  Building2,
  CreditCard,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Shield,
  Zap,
  LayoutDashboard,
} from "lucide-react";

import { accountingNavItems } from "@/src/lib/accounting/nav";

const businessNavItems = [
  { href: "/business/accounting", label: "Accounting", shortLabel: "Acct", icon: Calculator },
  { href: "/business/crm", label: "CRM", shortLabel: "CRM", icon: Users },
  {
    href: "/business/company-cards",
    label: "Cards",
    shortLabel: "Cards",
    icon: CreditCard,
    primary: true,
  },
  { href: "/business/pos", label: "POS", shortLabel: "POS", icon: ShoppingBag },
  { href: "/business/owner", label: "Admin", shortLabel: "Admin", icon: Shield },
];

const sidebarNavItems = [
  { href: "/business/company-cards", label: "Company Cards", icon: CreditCard },
  { href: "/business/accounting", label: "Accounting", icon: Calculator },
  { href: "/business/company-management", label: "Company", icon: Building2 },
  { href: "/business/crm", label: "CRM", icon: Users },
  { href: "/business/owner", label: "Admin", icon: Shield },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

const moduleNavItems = [
  { href: "/business/pos", label: "POS", icon: ShoppingBag },
  { href: "/business/inventory", label: "Inventory", icon: Package },
  { href: "/business/procurement", label: "Procurement", icon: Receipt },
];

export default function BusinessNav({
  isMasterUser = false,
  activeCompanyName = null,
}: {
  isMasterUser?: boolean;
  activeCompanyName?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const currentPath = pathname ?? "";
  const isAccountingScope =
    currentPath === "/business/accounting" || currentPath.startsWith("/business/accounting/");

  return (
    <>
      {/* ── Desktop Sidebar (dark, matches design) ── */}
      <aside className="hidden md:flex md:w-48 md:flex-col md:rounded-2xl md:bg-neutral-900 md:p-3 md:min-h-[24rem]">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Cardlink</span>
        </div>

        {/* Company info */}
        <div className="mb-4 rounded-lg bg-neutral-800 px-3 py-2">
          {isMasterUser ? (
            <p className="text-[10px] font-semibold text-amber-400">Master</p>
          ) : null}
          <p className="truncate text-xs text-neutral-400">
            {activeCompanyName ?? "No company"}
          </p>
        </div>

        {/* Main nav */}
        <div className="space-y-0.5">
          {sidebarNavItems.map((item) => {
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Module section */}
        <div className="mt-6 border-t border-neutral-800 pt-3">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
            Modules
          </span>
          <div className="mt-2 space-y-0.5">
            {moduleNavItems.map((item) => {
              const isActive =
                currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
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

      {/* ── Mobile Bottom Nav (client-style) ── */}
      {isAccountingScope ? (
        <>
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-100 bg-white/95 backdrop-blur-xl md:hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-md"
                aria-label="Open business modules"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
                {accountingNavItems.map((item) => {
                  const active = currentPath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {item.shortLabel}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {moreOpen ? (
            <div className="fixed inset-0 z-30 md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-neutral-900/40"
                onClick={() => setMoreOpen(false)}
                aria-label="Close module picker"
              />
              <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Business Modules
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[...sidebarNavItems, ...moduleNavItems].map((item) => {
                    const isActive =
                      currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
                          isActive
                            ? "bg-primary-50 text-primary-800"
                            : "bg-neutral-50 text-neutral-600"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-100 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-end justify-between px-5">
            {businessNavItems.map((item) => {
              const isActive =
                currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative -mt-6 flex flex-1 flex-col items-center"
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md transition ${
                        isActive
                          ? "bg-primary-700 text-white"
                          : "bg-primary-600 text-white"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="mt-2 text-[11px] font-medium text-neutral-500">
                      {item.shortLabel}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition ${
                    isActive ? "text-primary-600" : "text-neutral-400"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                      isActive ? "bg-primary-50" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.shortLabel}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
