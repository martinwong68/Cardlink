import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("hr_employees")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  const { data, error } = await supabase
    .from("hr_employees")
    .insert({
      company_id: companyId,
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      position: body.position || null,
      department: body.department || null,
      employment_type: body.employment_type || "full_time",
      start_date: body.start_date || null,
      salary: body.salary ?? 0,
      salary_period: body.salary_period || "monthly",
      avatar_url: body.avatar_url || null,
      address: body.address || null,
      national_id: body.national_id || null,
      bank_name: body.bank_name || null,
      bank_account: body.bank_account || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      reporting_manager_id: body.reporting_manager_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employee: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hr_employees")
    .update({
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      position: body.position || null,
      department: body.department || null,
      employment_type: body.employment_type,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      salary: body.salary ?? 0,
      salary_period: body.salary_period,
      status: body.status,
      avatar_url: body.avatar_url || null,
      address: body.address || null,
      national_id: body.national_id || null,
      bank_name: body.bank_name || null,
      bank_account: body.bank_account || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      reporting_manager_id: body.reporting_manager_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employee: data });
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("hr_employees")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
