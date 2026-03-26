import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import { getUserAccessState } from "@/src/lib/access-state";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";
import BusinessNav from "@/components/BusinessNav";
import BusinessHeader from "./business-header";

export default async function BusinessLayout({
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

  const eligibility = await resolveBusinessEligibility(supabase, user);
  if (!eligibility.eligible) {
    redirect("/business/register-company");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("business_active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  let activeCompanyName: string | null = null;
  const activeCompanyId = (profileData?.business_active_company_id ?? null) as string | null;
  if (activeCompanyId) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("name")
      .eq("id", activeCompanyId)
      .maybeSingle();
    activeCompanyName = (companyData?.name ?? null) as string | null;
  }

  if (!activeCompanyName && eligibility.adminCompanyIds.length > 0) {
    const { data: firstManagedCompany } = await supabase
      .from("companies")
      .select("name")
      .in("id", eligibility.adminCompanyIds)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();
    activeCompanyName = (firstManagedCompany?.name ?? null) as string | null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <BusinessHeader userId={user.id} activeCompanyName={activeCompanyName} activeCompanyId={activeCompanyId} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
      <BusinessNav />
    </div>
  );
}
