"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (t.href !== "/admin" && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
