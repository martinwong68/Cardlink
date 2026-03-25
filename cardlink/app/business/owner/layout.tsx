"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/business/owner", label: "Dashboard" },
  { href: "/business/owner/users", label: "Users" },
  { href: "/business/owner/modules", label: "Modules" },
  { href: "/business/owner/approval-settings", label: "Approvals" },
  { href: "/business/owner/billing", label: "Billing" },
  { href: "/business/owner/security", label: "Security" },
  { href: "/business/owner/audit", label: "Audit" },
  { href: "/business/owner/api-keys", label: "API Keys" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="space-y-4">
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/business/owner" && pathname.startsWith(t.href));
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
