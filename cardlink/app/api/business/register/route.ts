import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";

type AddressInput = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
};

type RegisterRequest = {
  companyName?: string;
  businessType?: string;
  industry?: string;
  registrationNumber?: string;
  taxId?: string;
  foundedDate?: string;
  employeeRange?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: AddressInput;
  plan?: string;
};

const VALID_INDUSTRIES = new Set([
  "retail", "food", "services", "tech", "health",
  "education", "finance", "realestate", "entertainment",
  "manufacturing", "logistics", "agriculture", "other",
]);

const VALID_PLANS = new Set(["free", "pro", "enterprise"]);

const VALID_BUSINESS_TYPES = new Set([
  "sole_proprietorship", "partnership", "corporation", "llc",
  "nonprofit", "cooperative", "franchise", "other",
]);

const VALID_EMPLOYEE_RANGES = new Set([
  "1", "2-10", "11-50", "51-200", "201-500", "501-1000", "1001+",
]);

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  /* Block if already eligible (prevent duplicate companies) */
  const eligibility = await resolveBusinessEligibility(supabase, user);
  if (eligibility.eligible) {
    return NextResponse.json(
      { error: "You already have business access." },
      { status: 409 }
    );
  }

  const body = (await request.json()) as RegisterRequest;
  const companyName = body.companyName?.trim();
  const businessType = body.businessType?.trim();
  const industry = body.industry?.trim();
  const plan = body.plan?.trim();

  if (!companyName || companyName.length < 2 || companyName.length > 120) {
    return NextResponse.json(
      { error: "Company name must be between 2 and 120 characters." },
      { status: 400 }
    );
  }

  if (!businessType || !VALID_BUSINESS_TYPES.has(businessType)) {
    return NextResponse.json(
      { error: "Invalid business type selection." },
      { status: 400 }
    );
  }

  if (!industry || !VALID_INDUSTRIES.has(industry)) {
    return NextResponse.json(
      { error: "Invalid industry selection." },
      { status: 400 }
    );
  }

  if (!plan || !VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: "Invalid plan selection." },
      { status: 400 }
    );
  }

  /* Validate optional fields */
  const registrationNumber = body.registrationNumber?.trim() || null;
  const taxId = body.taxId?.trim() || null;
  const foundedDate = body.foundedDate || null;
  const employeeRange = body.employeeRange?.trim() || null;
  const website = body.website?.trim() || null;
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (employeeRange && !VALID_EMPLOYEE_RANGES.has(employeeRange)) {
    return NextResponse.json(
      { error: "Invalid employee range." },
      { status: 400 }
    );
  }

  const slug = generateSlug(companyName) || `company-${Date.now()}`;

  /* Use admin client for bootstrap inserts that bypass RLS.
     The user-scoped client can't insert company_members because
     can_manage_company() requires existing membership (chicken-and-egg). */
  const admin = createAdminClient();

  /* Create company with extended fields.
     Note: `industry` and `plan` are NOT columns — store in `settings` JSONB. */
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: companyName,
      slug,
      business_type: businessType,
      registration_number: registrationNumber,
      tax_id: taxId,
      founded_date: foundedDate,
      employee_count_range: employeeRange,
      website,
      email,
      phone,
      settings: { industry, plan },
      created_by: user.id,
      is_active: true,
      is_banned: false,
      onboarding_completed: true,
    })
    .select("id")
    .single();

  if (companyError) {
    console.error("business.register.company_create_failed", companyError);
    return NextResponse.json(
      { error: "Failed to create company. Please try again." },
      { status: 500 }
    );
  }

  /* Add user as owner in company_members */
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    console.error("business.register.member_create_failed", memberError);
    /* Clean up: delete the company if member assignment failed */
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json(
      { error: "Failed to assign ownership. Please try again." },
      { status: 500 }
    );
  }

  /* Create primary address if provided */
  const addr = body.address;
  if (addr?.addressLine1?.trim()) {
    await admin.from("company_addresses").insert({
      company_id: company.id,
      label: "headquarters",
      address_line_1: addr.addressLine1.trim(),
      address_line_2: addr.addressLine2?.trim() || null,
      city: addr.city?.trim() || "",
      state_province: addr.stateProvince?.trim() || null,
      postal_code: addr.postalCode?.trim() || null,
      country: addr.country?.trim() || "US",
      is_primary: true,
    });
  }

  /* Set as active company in user profile */
  await admin
    .from("profiles")
    .update({ business_active_company_id: company.id })
    .eq("id", user.id);

  return NextResponse.json(
    {
      contract: "business.register.v2",
      status: "created",
      companyId: company.id,
      companyName,
      plan,
    },
    { status: 201 }
  );
}
