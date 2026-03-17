"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Calculator,
  Building2,
  CreditCard,
  Home,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Shield,
  Zap,
  X,
} from "lucide-react";

import { accountingNavItems } from "@/src/lib/accounting/nav";

/* ── Bottom nav items (mobile, 5 buttons, Home center) ── */
const mobileNavItems = [
  { href: "/business/crm", label: "CRM", icon: Users },
  { href: "/business/accounting", label: "Acct", icon: Calculator },
  { href: "/business", label: "Home", icon: Home, center: true },
  { href: "/business/company-cards", label: "Cards", icon: CreditCard },
  { href: "/business/owner", label: "Admin", icon: Shield },
];

/* ── Desktop sidebar items ── */
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

/* ── CRM sub-nav items ── */
const crmSubNavItems = [
  { href: "/business/crm", label: "Dashboard" },
  { href: "/business/crm/leads", label: "Leads" },
  { href: "/business/crm/deals", label: "Deals" },
  { href: "/business/crm/contacts", label: "Contacts" },
  { href: "/business/crm/activities", label: "Activities" },
  { href: "/business/crm/campaigns", label: "Campaigns" },
];

/* ── POS sub-nav items ── */
const posSubNavItems = [
  { href: "/business/pos", label: "Terminal" },
  { href: "/business/pos/orders", label: "Orders" },
  { href: "/business/pos/products", label: "Products" },
  { href: "/business/pos/shifts", label: "Shifts" },
];

/* ── Owner/Admin sub-nav items ── */
const adminSubNavItems = [
  { href: "/business/owner", label: "Overview" },
  { href: "/business/owner/users", label: "Users" },
  { href: "/business/owner/security", label: "Security" },
  { href: "/business/owner/api-keys", label: "API Keys" },
  { href: "/business/owner/audit", label: "Audit Log" },
  { href: "/business/owner/billing", label: "Billing" },
  { href: "/business/owner/modules", label: "Modules" },
];

export default function BusinessNav({
  isMasterUser = false,
  activeCompanyName = null,
}: {
  isMasterUser?: boolean;
  activeCompanyName?: string | null;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPath = pathname ?? "";

  /* Determine which sub-nav to show in the drawer */
  const isAccounting = currentPath.startsWith("/business/accounting");
  const isCrm = currentPath.startsWith("/business/crm");
  const isPos = currentPath.startsWith("/business/pos");
  const isAdmin = currentPath.startsWith("/business/owner");

  const hasSubNav = isAccounting || isCrm || isPos || isAdmin;

  const drawerItems = isAccounting
    ? accountingNavItems.map((item) => ({ href: item.href, label: item.shortLabel }))
    : isCrm
    ? crmSubNavItems
    : isPos
    ? posSubNavItems
    : isAdmin
    ? adminSubNavItems
    : [];

  const drawerTitle = isAccounting
    ? "Accounting"
    : isCrm
    ? "CRM"
    : isPos
    ? "POS"
    : isAdmin
    ? "Admin"
    : "";

  const handleNavClick = (href: string, isActive: boolean) => {
    if (isActive && hasSubNav) {
      setDrawerOpen((prev) => !prev);
      return true; // handled, don't navigate
    }
    setDrawerOpen(false);
    return false; // let Link navigate
  };

  return (
    <>
      {/* ── Desktop Sidebar (dark, matches Reference) ── */}
      <aside className="hidden md:flex md:w-48 md:flex-col md:rounded-2xl md:bg-gray-900 md:p-3 md:min-h-[24rem]">
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

        {/* Module section */}
        <div className="mt-6 border-t border-gray-800 pt-3">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
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

      {/* ── Mobile Bottom Nav (5 flat buttons, Home center, same style as client) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white px-2 py-2 md:hidden">
        <div className="flex justify-around">
          {mobileNavItems.map((item) => {
            const isActive =
              item.center
                ? currentPath === "/business" || currentPath === "/business/"
                : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (handleNavClick(item.href, isActive)) {
                    e.preventDefault();
                  }
                }}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
              >
                <Icon
                  className={`h-[18px] w-[18px] ${
                    isActive ? "text-indigo-600" : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive
                      ? "font-medium text-indigo-600"
                      : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Drawer overlay for sub-navigation ── */}
      {drawerOpen && hasSubNav ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close drawer"
          />
          <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {drawerTitle}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {drawerItems.map((item) => {
                const active =
                  currentPath === item.href ||
                  (item.href !== "/business/crm" &&
                    item.href !== "/business/pos" &&
                    item.href !== "/business/owner" &&
                    currentPath.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-800"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Quick access to other modules */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Modules
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[...sidebarNavItems, ...moduleNavItems]
                  .filter((item) => {
                    const prefix = isAccounting
                      ? "/business/accounting"
                      : isCrm
                      ? "/business/crm"
                      : isPos
                      ? "/business/pos"
                      : "/business/owner";
                    return !item.href.startsWith(prefix);
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                      >
                        <Icon className="h-3 w-3" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
