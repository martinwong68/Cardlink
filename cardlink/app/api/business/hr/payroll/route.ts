import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const periodStart = searchParams.get("period_start");
  const periodEnd = searchParams.get("period_end");

  let query = supabase
    .from("hr_payroll")
    .select("*, hr_employees(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (periodStart) query = query.gte("period_start", periodStart);
  if (periodEnd) query = query.lte("period_end", periodEnd);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payroll: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  // Generate payroll for all active employees
  if (body.action === "generate") {
    const { data: employees } = await supabase
      .from("hr_employees")
      .select("id, salary, salary_period")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: "No active employees found" }, { status: 400 });
    }

    const rows = employees.map((emp) => ({
      company_id: companyId,
      employee_id: emp.id as string,
      period_start: body.period_start,
      period_end: body.period_end,
      basic_salary: emp.salary as number,
      overtime: 0,
      deductions: 0,
      allowances: 0,
      net_pay: emp.salary as number,
      status: "draft",
    }));

    const { data, error } = await supabase
      .from("hr_payroll")
      .insert(rows)
      .select("*, hr_employees(full_name)");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payroll: data }, { status: 201 });
  }

  // Single payroll record
  const { data, error } = await supabase
    .from("hr_payroll")
    .insert({
      company_id: companyId,
      employee_id: body.employee_id,
      period_start: body.period_start,
      period_end: body.period_end,
      basic_salary: body.basic_salary ?? 0,
      overtime: body.overtime ?? 0,
      deductions: body.deductions ?? 0,
      allowances: body.allowances ?? 0,
      net_pay: body.net_pay ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payroll: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  // Bulk status update
  if (body.action === "bulk_update" && body.ids && body.status) {
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "paid") updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from("hr_payroll")
      .update(updateData)
      .in("id", body.ids)
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "ok" });
  }

  // Single record update
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (body.overtime != null) updateData.overtime = body.overtime;
  if (body.deductions != null) updateData.deductions = body.deductions;
  if (body.allowances != null) updateData.allowances = body.allowances;
  if (body.net_pay != null) updateData.net_pay = body.net_pay;
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "paid") updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("hr_payroll")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payroll: data });
}
