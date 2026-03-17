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
      <aside className="hidden md:flex md:w-56 md:flex-col md:gap-2 md:rounded-[1.7rem] md:border md:border-gray-100/80 md:bg-white/85 md:p-4 md:shadow-lg md:shadow-slate-200/60 md:backdrop-blur">
        <p className="app-kicker">
          CardLink
        </p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const currentPath = pathname ?? "";
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white px-2 py-2 md:hidden">
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
    </>
  );
}
