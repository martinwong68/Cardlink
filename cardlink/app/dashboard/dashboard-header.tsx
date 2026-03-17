"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type DashboardHeaderProps = {
  profileName: string;
  initials: string;
  avatarUrl: string | null;
  userId: string;
};

export default function DashboardHeader({
  profileName,
  initials,
  avatarUrl,
  userId,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboardNav");
  const td = useTranslations("dashboard");

  const getPageTitle = () => {
    if (pathname?.includes("/explore")) return t("discount");
    if (pathname?.includes("/community")) return t("community");
    if (pathname?.includes("/cards")) return t("cards");
    if (pathname?.includes("/membership")) return t("membership");
    if (pathname?.includes("/settings")) return t("settings");
    if (pathname?.includes("/nfc")) return "NFC";
    return td("title");
  };

  const firstName = profileName.split(" ")[0];

  return (
    <header className="sticky top-0 z-10 bg-primary-600">
      <div className="app-page py-3 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{getPageTitle()}</h1>
            <p className="text-xs text-primary-200">
              {td("brand")} · {firstName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="dashboard-header-control">
              <LanguageSwitcher compact />
            </div>
            <div className="dashboard-header-control">
              <NotificationBell userId={userId} />
            </div>
            <Link
              href="/dashboard/settings/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-400 text-xs font-bold text-white"
              aria-label="Profile settings"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
