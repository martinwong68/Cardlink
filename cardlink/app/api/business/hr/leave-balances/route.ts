import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { LEAVE_TYPES } from "@/src/lib/hr/constants";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  let query = supabase
    .from("hr_leave_balances")
    .select("*, hr_employees(full_name)")
    .eq("company_id", companyId)
    .eq("year", parseInt(year));

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query.order("leave_type");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", balances: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  // Bulk initialize balances for all active employees
  if (body.action === "initialize") {
    const year = body.year || new Date().getFullYear();
    const entitlements = body.entitlements as Record<string, number> | undefined;

    const { data: employees } = await supabase
      .from("hr_employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "No active employees found" },
        { status: 400 },
      );
    }

    const rows = employees.flatMap((emp) =>
      LEAVE_TYPES.map((lt) => ({
        company_id: companyId,
        employee_id: emp.id as string,
        leave_type: lt,
        year,
        entitlement:
          entitlements?.[lt] ?? (lt === "annual" ? 14 : lt === "sick" ? 14 : 0),
        used: 0,
        carried_forward: 0,
      })),
    );

    const { data, error } = await supabase
      .from("hr_leave_balances")
      .upsert(rows, {
        onConflict: "company_id,employee_id,leave_type,year",
      })
      .select();

    if (error) {
      if (error.code === "23505")
        return NextResponse.json(
          { error: "Duplicate leave balance record" },
          { status: 409 },
        );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", balances: data }, { status: 201 });
  }

  // Single balance record
  if (!body.employee_id || !body.leave_type) {
    return NextResponse.json(
      { error: "employee_id and leave_type are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("hr_leave_balances")
    .upsert(
      {
        company_id: companyId,
        employee_id: body.employee_id,
        leave_type: body.leave_type,
        year: body.year || new Date().getFullYear(),
        entitlement: body.entitlement ?? 0,
        used: body.used ?? 0,
        carried_forward: body.carried_forward ?? 0,
      },
      { onConflict: "company_id,employee_id,leave_type,year" },
    )
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate leave balance record" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", balance: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.entitlement != null) updateData.entitlement = body.entitlement;
  if (body.used != null) updateData.used = body.used;
  if (body.carried_forward != null)
    updateData.carried_forward = body.carried_forward;

  const { data, error } = await supabase
    .from("hr_leave_balances")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", balance: data });
}
