import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import { getUserAccessState } from "@/src/lib/access-state";

import DashboardHeader from "./dashboard-header";
import DashboardNav from "./dashboard-nav";

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
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-6">
      <DashboardHeader
        profileName={profileName}
        initials={initials}
        avatarUrl={profile?.avatar_url ?? null}
        userId={user.id}
      />

      <div className="app-page flex gap-6 py-6">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
