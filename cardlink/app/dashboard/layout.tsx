import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";

import DashboardNav from "./dashboard-nav";
import NotificationBell from "@/components/NotificationBell";

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
          <NotificationBell userId={user.id} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
