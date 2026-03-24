"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Crown,
  MessageSquare,
  Search,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardNav() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("dashboardNav");

  const navItems = [
    { href: "/dashboard/explore", label: t("discount"), icon: Search },
    { href: "/dashboard/community", label: t("community"), icon: MessageSquare },
    { href: "/dashboard/cards", label: t("cards"), icon: CreditCard },
    { href: "/dashboard/membership", label: t("membership"), icon: Crown },
    { href: "/dashboard/settings", label: t("settings"), icon: User },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderNavItems = (keyPrefix: string) =>
    navItems.map((item) => {
      const active = isActive(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={`${keyPrefix}-${item.href}`}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-0.5 py-1"
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
            {item.label}
          </span>
        </Link>
      );
    });

  return (
    <>
      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white px-2 py-2 md:hidden">
        <div className="flex">
          {renderNavItems("mob")}
        </div>
      </nav>

      {/* ── Desktop/Tablet Floating Bottom Nav ── */}
      <nav className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 md:flex">
        <div className="flex items-end rounded-2xl border border-gray-200/60 bg-white/90 px-4 pt-2 pb-2 shadow-lg backdrop-blur-md w-[26rem]">
          {renderNavItems("desk")}
        </div>
      </nav>
    </>
  );
}
