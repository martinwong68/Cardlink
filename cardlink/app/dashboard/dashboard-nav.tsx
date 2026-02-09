"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, Home, Settings, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard/feed", label: "Feed", icon: Home },
  { href: "/dashboard/contacts", label: "CRM", icon: Users },
  { href: "/dashboard/card", label: "My Card", icon: CreditCard, primary: true },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-stretch justify-between px-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const isPrimary = item.primary;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition ${
                isActive ? "text-violet-600" : "text-slate-500"
              } ${isPrimary ? "relative -mt-4" : ""}`}
            >
              <span
                className={`flex items-center justify-center rounded-2xl ${
                  isPrimary
                    ? "h-12 w-12 bg-violet-600 text-white shadow-lg"
                    : "h-9 w-9"
                }`}
              >
                <Icon className={isPrimary ? "h-6 w-6" : "h-5 w-5"} />
              </span>
              <span className={isPrimary ? "text-[10px] font-semibold" : ""}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
