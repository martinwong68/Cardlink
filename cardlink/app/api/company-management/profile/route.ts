import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type CompanyProfileUpdate = {
  company_id?: string;
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  business_type?: string | null;
  industry?: string | null;
  company_size?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

/**
 * GET /api/company-management/profile
 * Returns company + company_profiles data for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const [companyRes, profileRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, description, logo_url, cover_url, email, phone, website, business_type")
      .eq("id", companyId)
      .single(),
    supabase
      .from("company_profiles")
      .select("industry, company_size, address_line1, address_line2, city, state_region, postal_code, country, registration_number")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (companyRes.error) {
    return NextResponse.json({ error: companyRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    company: companyRes.data,
    profile: profileRes.data ?? null,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as CompanyProfileUpdate;
  const expectedCompanyId = body.company_id?.trim();

  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // Update companies table
  const { data, error } = await supabase
    .from("companies")
    .update({
      name,
      description: body.description?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      cover_url: body.cover_url?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      business_type: body.business_type?.trim() || null,
    })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Active company was not found for update." },
      { status: 404 }
    );
  }

  // Upsert company_profiles if extended fields provided
  const hasProfileFields =
    body.industry !== undefined ||
    body.company_size !== undefined ||
    body.address_line1 !== undefined ||
    body.address_line2 !== undefined ||
    body.city !== undefined ||
    body.state_region !== undefined ||
    body.postal_code !== undefined ||
    body.country !== undefined;

  if (hasProfileFields) {
    const profileUpdate: Record<string, unknown> = { company_id: companyId };
    if (body.industry !== undefined) profileUpdate.industry = body.industry?.trim() || null;
    if (body.company_size !== undefined) profileUpdate.company_size = body.company_size?.trim() || null;
    if (body.address_line1 !== undefined) profileUpdate.address_line1 = body.address_line1?.trim() || null;
    if (body.address_line2 !== undefined) profileUpdate.address_line2 = body.address_line2?.trim() || null;
    if (body.city !== undefined) profileUpdate.city = body.city?.trim() || null;
    if (body.state_region !== undefined) profileUpdate.state_region = body.state_region?.trim() || null;
    if (body.postal_code !== undefined) profileUpdate.postal_code = body.postal_code?.trim() || null;
    if (body.country !== undefined) profileUpdate.country = body.country?.trim() || null;

    await supabase
      .from("company_profiles")
      .upsert(profileUpdate, { onConflict: "company_id" });
  }

  return NextResponse.json(
    {
      contract: "company.management.profile.v1",
      status: "updated",
      company_id: companyId,
    },
    { status: 200 }
  );
}