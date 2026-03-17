"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const crmNavItems = [
  { href: "/business/crm", label: "Dashboard", icon: "📊" },
  { href: "/business/crm/leads", label: "Leads", icon: "🎯" },
  { href: "/business/crm/deals", label: "Deals", icon: "💰" },
  { href: "/business/crm/contacts", label: "Contacts", icon: "👤" },
  { href: "/business/crm/activities", label: "Activities", icon: "📞" },
  { href: "/business/crm/campaigns", label: "Campaigns", icon: "📧" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {crmNavItems.map((item) => {
          const isActive =
            item.href === "/business/crm"
              ? pathname === "/business/crm"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
