"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { accountingNavItems } from "@/src/lib/accounting/nav";

export default function AccountingFunctionSelector() {
  const pathname = usePathname();
  const router = useRouter();

  const currentHref = useMemo(() => {
    const matched = accountingNavItems.find((item) => pathname === item.href);
    return matched?.href ?? accountingNavItems[0].href;
  }, [pathname]);

  return (
    <label className="flex w-full max-w-xs flex-col gap-1 text-xs font-semibold text-gray-500">
      Function
      <select
        value={currentHref}
        onChange={(event) => router.push(event.target.value)}
        className="app-input px-3 py-2.5 text-sm font-semibold text-gray-700"
        aria-label="Select accounting function"
      >
        {accountingNavItems.map((item) => (
          <option key={item.id} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
