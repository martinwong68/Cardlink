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
  const pathname = usePathname();
  const t = useTranslations("dashboardNav");

  const navItems = [
    { href: "/dashboard/explore", label: t("discount"), icon: Search },
    { href: "/dashboard/community", label: t("community"), icon: MessageSquare },
    { href: "/dashboard/cards", label: t("cards"), icon: CreditCard },
    { href: "/dashboard/membership", label: t("membership"), icon: Crown },
    { href: "/dashboard/settings", label: t("settings"), icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-52 md:flex-col md:rounded-xl md:border md:border-neutral-100 md:bg-white md:p-3 md:shadow-sm">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
          CardLink
        </p>
        <div className="mt-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const currentPath = pathname ?? "";
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Nav — matches Reference: 5 equal tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-100 bg-white px-2 py-2 md:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const currentPath = pathname ?? "";
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 transition ${
                  isActive
                    ? "font-medium text-primary-600"
                    : "text-neutral-400"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
