"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Globe } from "lucide-react";

import BusinessNotificationBell from "@/components/business/BusinessNotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const sectionLabels: Record<string, string> = {
  "/business/store": "Store",
  "/business/ai": "AI",
  "/business/notifications": "Notifications",
  "/business/settings": "Settings",
  "/business/accounting": "Accounting",
  "/business/crm": "CRM",
  "/business/company-cards": "Cards",
  "/business/company-management": "Company",
  "/business/pos": "POS",
  "/business/inventory": "Inventory",
  "/business/procurement": "Procurement",
  "/business/cards": "Cards",
  "/business/hr": "HR",
  "/business/booking": "Booking",
};

export default function BusinessHeader({
  userId,
  activeCompanyName,
  activeCompanyId,
}: {
  userId: string;
  activeCompanyName: string | null;
  activeCompanyId: string | null;
}) {
  const pathname = usePathname() ?? "";

  const sectionLabel =
    Object.entries(sectionLabels).find(([prefix]) =>
      pathname.startsWith(prefix)
    )?.[1] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {activeCompanyName ?? "Business"}
          </span>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-xs font-medium text-gray-700">
            {sectionLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <BusinessNotificationBell userId={userId} companyId={activeCompanyId} />
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            B
          </div>
        </div>
      </div>
    </header>
  );
}
