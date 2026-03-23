import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || null;
  const industry = url.searchParams.get("industry")?.trim() || null;
  const isActive = url.searchParams.get("is_active");

  const supabase = await createClient();
  let query = supabase
    .from("crm_accounts")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("account_name", `%${search}%`);
  }
  if (industry) {
    query = query.eq("industry", industry);
  }
  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "crm.accounts.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    accounts: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const accountName = body.account_name?.trim();

  if (!accountName) {
    return NextResponse.json({ error: "account_name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_accounts")
    .insert({
      company_id: guard.context.activeCompanyId,
      account_name: accountName,
      industry: body.industry?.trim() || null,
      company_size: body.company_size?.trim() || null,
      website: body.website?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      street: body.street?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      country: body.country?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      description: body.description?.trim() || null,
      owner_user_id: body.owner_user_id?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "crm.accounts.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    account_id: data.id,
  }, { status: 201 });
}
