"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import NotificationBell from "@/components/NotificationBell";

const pageTitles: Record<string, string> = {
  "/dashboard/explore": "Explore",
  "/dashboard/community": "Community",
  "/dashboard/cards": "My Cards",
  "/dashboard/membership": "Membership",
  "/dashboard/settings": "Settings",
  "/dashboard/nfc": "NFC Card",
  "/dashboard/notifications": "Notifications",
  "/dashboard/discover": "Discover",
  "/dashboard/scan": "Scan",
  "/dashboard/feed": "Feed",
  "/dashboard/discount": "Discounts",
  "/dashboard/contacts": "Contacts",
};

export default function DashboardHeader({
  profileName,
  initials,
  avatarUrl,
  userId,
}: {
  profileName: string;
  initials: string;
  avatarUrl: string | null;
  userId: string;
}) {
  const pathname = usePathname() ?? "";

  const title =
    Object.entries(pageTitles).find(([prefix]) =>
      pathname.startsWith(prefix)
    )?.[1] ?? "Dashboard";

  const firstName = profileName.split(" ")[0] ?? profileName;
  const isExplore = pathname.startsWith("/dashboard/explore");

  return (
    <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">{title}</div>
            <div className="text-xs text-gray-400">
              Welcome back, {firstName}
            </div>
          </div>
          <div className="dashboard-header-controls flex items-center gap-2">
            <NotificationBell userId={userId} />
            <Link
              href="/dashboard/settings/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
              aria-label="Profile"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                initials.charAt(0)
              )}
            </Link>
          </div>
        </div>
        {isExplore && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">
              Search discounts &amp; offers...
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
