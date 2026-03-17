import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";

type MainAccountRequest = {
  activeCompanyId?: string;
};

type CompanyOption = {
  id: string;
  name: string;
  slug: string | null;
  created_by?: string | null;
  access_role?: string;
};

type ProfileMainAccountRow = {
  is_master_user: boolean | null;
  business_active_company_id: string | null;
};

async function getManagedCompanies(params: {
  isMasterUser: boolean;
  adminCompanyIds: string[];
}) {
  const supabase = await createClient();

  if (params.isMasterUser) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, slug, created_by")
      .eq("is_active", true)
      .eq("is_banned", false)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(200);

    return ((data ?? []) as CompanyOption[]).map((company) => ({
      ...company,
      access_role: "master",
    }));
  }

  if (params.adminCompanyIds.length === 0) {
    return [] as CompanyOption[];
  }

  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, created_by")
    .in("id", params.adminCompanyIds)
    .order("name", { ascending: true });

  return (data ?? []) as CompanyOption[];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const eligibility = await resolveBusinessEligibility(supabase, user);
  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_master_user, business_active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? null) as ProfileMainAccountRow | null;
  const managedCompanies = await getManagedCompanies({
    isMasterUser: eligibility.isMasterUser,
    adminCompanyIds: eligibility.adminCompanyIds,
  });

  if (!eligibility.isMasterUser && managedCompanies.length > 0) {
    const { data: memberRows } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in(
        "company_id",
        managedCompanies.map((company) => company.id)
      );

    const roleMap = new Map(
      ((memberRows ?? []) as { company_id: string; role: string }[]).map((item) => [
        item.company_id,
        item.role,
      ])
    );

    managedCompanies.forEach((company) => {
      company.access_role =
        roleMap.get(company.id) ??
        (company.created_by === user.id ? "creator" : "admin");
    });
  }

  const managedIds = new Set(managedCompanies.map((company) => company.id));
  const requestedActiveId = profile?.business_active_company_id ?? null;
  const activeCompanyId =
    requestedActiveId && managedIds.has(requestedActiveId)
      ? requestedActiveId
      : managedCompanies[0]?.id ?? null;

  return NextResponse.json(
    {
      contract: "business.main_account.v1",
      eligible: eligibility.eligible,
      isMasterUser: eligibility.isMasterUser,
      isMasterUserInDb: profile?.is_master_user === true,
      activeCompanyId,
      managedCompanies,
    },
    { status: 200 }
  );
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json()) as MainAccountRequest;
  const activeCompanyId = body.activeCompanyId?.trim();

  if (!activeCompanyId) {
    return NextResponse.json(
      { error: "activeCompanyId is required." },
      { status: 400 }
    );
  }

  const eligibility = await resolveBusinessEligibility(supabase, user);
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Business access denied." },
      { status: 403 }
    );
  }

  const managedCompanies = await getManagedCompanies({
    isMasterUser: eligibility.isMasterUser,
    adminCompanyIds: eligibility.adminCompanyIds,
  });

  const allowed = managedCompanies.some((company) => company.id === activeCompanyId);
  if (!allowed) {
    return NextResponse.json(
      { error: "activeCompanyId is outside your management scope." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ business_active_company_id: activeCompanyId })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update active company." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      contract: "business.main_account.v1",
      status: "updated",
      activeCompanyId,
    },
    { status: 200 }
  );
}
