import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import { getUserAccessState } from "@/src/lib/access-state";

export default async function AdminLayout({
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

  // Verify the user is a platform admin
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Admin Header */}
      <header className="sticky top-0 z-20 border-b border-red-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white">
              CA
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">CardLink Admin</p>
              <p className="text-[10px] text-gray-500">Platform Administration</p>
            </div>
          </div>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {(adminUser.role as string) === "super_admin" ? "Super Admin" : (adminUser.role as string) === "moderator" ? "Moderator" : "Support"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
