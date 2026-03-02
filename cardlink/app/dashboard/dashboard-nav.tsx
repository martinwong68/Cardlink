"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  MessageSquare,
  Settings,
  TicketPercent,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations("dashboardNav");


  const navItems = [
    { href: "/dashboard/explore", label: t("discount"), icon: TicketPercent },
    { href: "/dashboard/community", label: t("community"), icon: MessageSquare },
    { href: "/dashboard/cards", label: t("cards"), icon: CreditCard, primary: true },
    { href: "/dashboard/membership", label: t("membership"), icon: UserRound },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <>
      <aside className="hidden md:flex md:w-56 md:flex-col md:gap-2 md:rounded-[1.7rem] md:border md:border-slate-200/80 md:bg-white/85 md:p-4 md:shadow-lg md:shadow-slate-200/60 md:backdrop-blur">
        <p className="app-kicker">
          CardLink
        </p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const currentPath = pathname ?? "";
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const isPrimary = item.primary;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-800"
                    : isPrimary
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40 hover:from-violet-700 hover:to-indigo-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/80 bg-white/92 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-end justify-between px-5">
          {navItems.map((item) => {
            const currentPath = pathname ?? "";
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const isPrimary = item.primary;

            if (isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-6 flex flex-1 flex-col items-center"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md transition ${
                      isActive
                        ? "bg-gradient-to-br from-violet-700 to-indigo-700 text-white"
                        : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="mt-2 text-[11px] font-semibold text-slate-500">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition ${
                  isActive ? "text-violet-700" : "text-slate-500"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive ? "bg-violet-100" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
