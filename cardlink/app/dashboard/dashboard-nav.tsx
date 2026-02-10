"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, MessageSquare, QrCode, User } from "lucide-react";

const navItems = [
  { href: "/dashboard/card", label: "Cards", icon: CreditCard },
  { href: "/dashboard/community", label: "Community", icon: MessageSquare },
  { href: "/dashboard/scan", label: "Scan", icon: QrCode },
  { href: "/dashboard/settings", label: "Profile", icon: User },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex md:w-56 md:flex-col md:gap-2 md:rounded-3xl md:border md:border-slate-200 md:bg-white md:p-4 md:shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-violet-50 text-violet-700"
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
        <div className="mx-auto flex w-full max-w-5xl items-stretch justify-between px-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

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
