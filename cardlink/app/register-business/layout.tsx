import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";

export default async function RegisterBusinessLayout({
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

  /* If user already has business access, send them straight to the app */
  const eligibility = await resolveBusinessEligibility(supabase, user);
  if (eligibility.eligible) {
    redirect("/business");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-8 md:py-16">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
