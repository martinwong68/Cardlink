"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, MessageSquare, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardNav() {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const t = useTranslations("dashboardNav");

  useEffect(() => {
    setIsReady(true);
  }, []);

  const navItems = [
    { href: "/dashboard/community", label: t("community"), icon: MessageSquare },
    { href: "/dashboard/cards", label: t("cards"), icon: CreditCard, primary: true },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <>
      <aside className="hidden md:flex md:w-56 md:flex-col md:gap-2 md:rounded-3xl md:border md:border-slate-200 md:bg-white md:p-4 md:shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const currentPath = isReady ? pathname : "";
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
                    ? "bg-violet-50 text-violet-700"
                    : isPrimary
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-end justify-between px-6">
          {navItems.map((item) => {
            const currentPath = isReady ? pathname : "";
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
                        ? "bg-indigo-700 text-white"
                        : "bg-indigo-600 text-white"
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
                  isActive ? "text-violet-600" : "text-slate-500"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl">
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
