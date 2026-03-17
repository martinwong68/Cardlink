"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/business/procurement", label: "Dashboard" },
  { href: "/business/procurement/vendors", label: "Vendors" },
  { href: "/business/procurement/requests", label: "Requests" },
  { href: "/business/procurement/orders", label: "Orders" },
  { href: "/business/procurement/goods-receipt", label: "Receipts" },
  { href: "/business/procurement/contracts", label: "Contracts" },
];

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="space-y-4">
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/business/procurement" && pathname.startsWith(t.href));
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
