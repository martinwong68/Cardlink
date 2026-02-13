import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";

import DashboardNav from "./dashboard-nav";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const profileName = profile?.full_name ?? user.email ?? "CardLink";
  const initials = getInitials(profileName);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
              {t("brand")}
            </p>
            <p className="text-sm text-slate-500">{t("title")}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell userId={user.id} />
            <Link
              href="/dashboard/settings/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white"
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

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
