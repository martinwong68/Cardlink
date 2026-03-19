import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const VALID_PLAN_SLUGS = new Set(["free", "professional", "business"]);
const VALID_INDUSTRIES = new Set([
  "retail", "fnb", "services", "manufacturing", "technology",
  "healthcare", "education", "construction", "professional", "other",
]);
const VALID_COMPANY_SIZES = new Set(["1-5", "6-20", "21-50", "50+"]);
const VALID_COUNTRIES = new Set(["MY", "HK", "SG", "other"]);
const VALID_CURRENCIES = new Set(["MYR", "HKD", "SGD", "USD"]);
const VALID_ACCOUNTING_BASES = new Set(["cash", "accrual"]);
const VALID_MONTHS = new Set([
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
]);
const VALID_MODULES = new Set([
  "accounting", "hr", "booking", "inventory", "pos", "crm", "procurement",
]);

type RegisterCompanyRequest = {
  planSlug?: string;
  companyName?: string;
  registrationNumber?: string;
  industry?: string;
  companySize?: string;
  yearEstablished?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  defaultCurrency?: string;
  taxRegistrationNumber?: string;
  taxRate?: number;
  fiscalYearEnd?: string;
  accountingBasis?: string;
  enabledModules?: string[];
  logoUrl?: string;
  coverUrl?: string;
};

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

  const body = (await request.json()) as RegisterCompanyRequest;

  /* ─── Validate required fields ─── */
  const planSlug = body.planSlug?.trim();
  const companyName = body.companyName?.trim();
  const industry = body.industry?.trim();
  const companySize = body.companySize?.trim();
  const addressLine1 = body.addressLine1?.trim();
  const city = body.city?.trim();
  const stateRegion = body.stateRegion?.trim();
  const postalCode = body.postalCode?.trim();
  const country = body.country?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim();
  const fiscalYearEnd = body.fiscalYearEnd?.trim();
  const accountingBasis = body.accountingBasis?.trim();
  const defaultCurrency = body.defaultCurrency?.trim() || "USD";

  if (!planSlug || !VALID_PLAN_SLUGS.has(planSlug)) {
    return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
  }
  if (!companyName || companyName.length < 2 || companyName.length > 120) {
    return NextResponse.json({ error: "Company name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (!industry || !VALID_INDUSTRIES.has(industry)) {
    return NextResponse.json({ error: "Invalid industry." }, { status: 400 });
  }
  if (!companySize || !VALID_COMPANY_SIZES.has(companySize)) {
    return NextResponse.json({ error: "Invalid company size." }, { status: 400 });
  }
  if (!addressLine1) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }
  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }
  if (!stateRegion) {
    return NextResponse.json({ error: "State/Region is required." }, { status: 400 });
  }
  if (!postalCode) {
    return NextResponse.json({ error: "Postal code is required." }, { status: 400 });
  }
  if (!country || !VALID_COUNTRIES.has(country)) {
    return NextResponse.json({ error: "Invalid country." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!fiscalYearEnd || !VALID_MONTHS.has(fiscalYearEnd)) {
    return NextResponse.json({ error: "Fiscal year end is required." }, { status: 400 });
  }
  if (!accountingBasis || !VALID_ACCOUNTING_BASES.has(accountingBasis)) {
    return NextResponse.json({ error: "Accounting basis is required." }, { status: 400 });
  }
  if (!VALID_CURRENCIES.has(defaultCurrency)) {
    return NextResponse.json({ error: "Invalid currency." }, { status: 400 });
  }

  /* Validate optional fields */
  const registrationNumber = body.registrationNumber?.trim() || null;
  const yearEstablished = body.yearEstablished ?? null;
  const addressLine2 = body.addressLine2?.trim() || null;
  const website = body.website?.trim() || null;
  const taxRegistrationNumber = body.taxRegistrationNumber?.trim() || null;
  const taxRate = body.taxRate ?? null;
  const logoUrl = body.logoUrl || null;
  const coverUrl = body.coverUrl || null;

  /* Validate enabled modules */
  const enabledModules = (body.enabledModules ?? ["accounting", "inventory", "pos", "crm"])
    .filter((m) => VALID_MODULES.has(m));
  if (!enabledModules.includes("accounting")) {
    enabledModules.unshift("accounting");
  }

  if (yearEstablished !== null && (yearEstablished < 1800 || yearEstablished > new Date().getFullYear())) {
    return NextResponse.json({ error: "Invalid year established." }, { status: 400 });
  }
  if (taxRate !== null && (taxRate < 0 || taxRate > 100)) {
    return NextResponse.json({ error: "Tax rate must be between 0 and 100." }, { status: 400 });
  }

  const slug = generateSlug(companyName) || `company-${Date.now()}`;

  const admin = createAdminClient();

  /* 1. Lookup the plan */
  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, ai_actions_monthly, storage_mb")
    .eq("slug", planSlug)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Selected plan not found." }, { status: 400 });
  }

  /* 2. Create company */
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: companyName,
      slug,
      business_type: "corporation",
      registration_number: registrationNumber,
      email,
      phone,
      website,
      settings: { industry, plan: planSlug },
      created_by: user.id,
      is_active: true,
      is_banned: false,
      onboarding_completed: true,
      logo_url: logoUrl,
      cover_url: coverUrl,
    })
    .select("id")
    .single();

  if (companyError) {
    console.error("register-company.company_create_failed", companyError);
    return NextResponse.json({ error: "Failed to create company." }, { status: 500 });
  }

  /* 3. Create company_profiles */
  const { error: profileError } = await admin.from("company_profiles").insert({
    company_id: company.id,
    registration_number: registrationNumber,
    industry,
    company_size: companySize,
    year_established: yearEstablished,
    address_line1: addressLine1,
    address_line2: addressLine2,
    city,
    state_region: stateRegion,
    postal_code: postalCode,
    country,
    phone,
    email,
    website,
    default_currency: defaultCurrency,
    tax_registration_number: taxRegistrationNumber,
    tax_rate: taxRate,
    fiscal_year_end: fiscalYearEnd,
    accounting_basis: accountingBasis,
    enabled_modules: JSON.stringify(enabledModules),
  });

  if (profileError) {
    console.error("register-company.profile_create_failed", profileError);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "Failed to create company profile." }, { status: 500 });
  }

  /* 4. Create company_subscriptions */
  const { error: subError } = await admin.from("company_subscriptions").insert({
    company_id: company.id,
    plan_id: plan.id,
    status: "active",
    ai_actions_limit: plan.ai_actions_monthly,
    storage_limit_mb: plan.storage_mb,
  });

  if (subError) {
    console.error("register-company.subscription_create_failed", subError);
    /* Cleanup */
    await admin.from("company_profiles").delete().eq("company_id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "Failed to create subscription." }, { status: 500 });
  }

  /* 5. Add user as owner in company_members */
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    console.error("register-company.member_create_failed", memberError);
    /* Cleanup */
    await admin.from("company_subscriptions").delete().eq("company_id", company.id);
    await admin.from("company_profiles").delete().eq("company_id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "Failed to assign ownership." }, { status: 500 });
  }

  /* 6. Set as active company */
  await admin
    .from("profiles")
    .update({ business_active_company_id: company.id })
    .eq("id", user.id);

  return NextResponse.json(
    {
      contract: "business.register-company.v1",
      status: "created",
      companyId: company.id,
      companyName,
      planSlug,
    },
    { status: 201 }
  );
}
