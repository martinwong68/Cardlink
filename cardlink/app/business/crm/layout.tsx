"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const crmNavItems = [
  { href: "/business/crm", label: "Pipeline" },
  { href: "/business/crm/leads", label: "Leads" },
  { href: "/business/crm/deals", label: "Deals" },
  { href: "/business/crm/contacts", label: "Contacts" },
  { href: "/business/crm/activities", label: "Activities" },
  { href: "/business/crm/campaigns", label: "Campaigns" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {crmNavItems.map((item) => {
          const isActive =
            item.href === "/business/crm"
              ? pathname === "/business/crm"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
