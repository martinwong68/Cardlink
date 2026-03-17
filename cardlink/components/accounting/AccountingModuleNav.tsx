"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { accountingNavItems } from "@/src/lib/accounting/nav";

export default function AccountingModuleNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 rounded-3xl border border-gray-100 bg-white p-4 md:flex md:flex-col">
        <div className="mb-4 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Accounting App</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">AccounterPro</p>
        </div>
        <nav className="space-y-1">
          {accountingNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white md:hidden">
        <div className="flex overflow-x-auto px-2 py-2">
          {accountingNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
