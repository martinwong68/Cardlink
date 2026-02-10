import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";

import DashboardNav from "./dashboard-nav";

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

  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "User";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
              CardLink
            </p>
            <p className="text-sm text-slate-500">Dashboard</p>
          </div>
          <Link
            href="/dashboard/settings/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white"
            aria-label="View profile settings"
          >
            {avatarInitial}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
