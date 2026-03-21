"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Zap } from "lucide-react";

import BusinessNotificationBell from "@/components/business/BusinessNotificationBell";

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
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 mx-auto max-w-5xl">
        {/* Left: breadcrumb (mobile) / branding + breadcrumb (desktop) */}
        <div className="flex items-center gap-2">
          {/* Desktop branding — hidden on mobile since sidebar provides it */}
          <Link href="/business" className="hidden md:flex items-center gap-1.5 mr-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Cardlink</span>
          </Link>

          <span className="text-xs text-gray-400">
            {activeCompanyName ?? "Business"}
          </span>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-xs font-medium text-gray-700">
            {sectionLabel}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          <BusinessNotificationBell userId={userId} companyId={activeCompanyId} />
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            B
          </div>
        </div>
      </div>
    </header>
  );
}
