"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/business/pos", label: "Dashboard" },
  { href: "/business/pos/terminal", label: "Terminal" },
  { href: "/business/pos/products", label: "Products" },
  { href: "/business/pos/orders", label: "Orders" },
  { href: "/business/pos/shifts", label: "Shifts" },
];

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="space-y-4">
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/business/pos" && pathname.startsWith(t.href));
          return (
            <Link key={t.href} href={t.href} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${active ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
