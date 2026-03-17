"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import AccountingFunctionSelector from "@/components/accounting/AccountingFunctionSelector";
import { accountingNavItems } from "@/src/lib/accounting/nav";

export default function AccountingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const activeItem = useMemo(
    () => accountingNavItems.find((item) => pathname === item.href) ?? accountingNavItems[0],
    [pathname]
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="app-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="app-kicker">Accounting App</p>
            <h1 className="app-title mt-2 text-2xl font-bold">{activeItem.label}</h1>
            <p className="app-subtitle mt-1 text-sm">
              Multi-page accounting workspace with company-scoped data and role-aware actions.
            </p>
          </div>
          <AccountingFunctionSelector />
        </div>
      </section>
      {children}
    </div>
  );
}
