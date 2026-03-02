import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";
import { getUserAccessState } from "@/src/lib/access-state";

import DashboardNav from "./dashboard-nav";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeaderBackButton from "@/components/HeaderBackButton";

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accessState = await getUserAccessState(supabase, user);

  if (accessState.isBanned) {
    redirect("/banned");
  }

  const profile = accessState.profile;

  const profileName = profile?.full_name ?? user.email ?? "CardLink";
  const initials = getInitials(profileName);

  return (
    <div className="app-shell pb-24 md:pb-10">
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/72 backdrop-blur-xl">
        <div className="app-page flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <HeaderBackButton ariaLabel="Back" />
            <div>
              <p className="app-kicker">{t("brand")}</p>
              <p className="text-sm text-slate-500">{t("title")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell userId={user.id} />
            <Link
              href="/dashboard/settings/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-semibold text-white shadow-lg shadow-violet-300/30"
              aria-label="Profile settings"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profileName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="app-page flex gap-6 py-6">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
