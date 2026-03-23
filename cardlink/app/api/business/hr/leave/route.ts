import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";
import { notifySystem } from "@/src/lib/business-notifications";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("hr_leave_requests")
    .select("*, hr_employees(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leave_requests: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;
  const body = await request.json();

  const { data, error } = await supabase
    .from("hr_leave_requests")
    .insert({
      company_id: companyId,
      employee_id: body.employee_id,
      leave_type: body.leave_type,
      start_date: body.start_date,
      end_date: body.end_date,
      days: body.days,
      reason: body.reason || null,
    })
    .select("*, hr_employees(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admins about new leave request
  const employeeName = (data as Record<string, unknown>).hr_employees
    ? ((data as Record<string, unknown>).hr_employees as { full_name: string }).full_name
    : "Employee";

  // Get all admin users for this company
  const { data: admins } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .in("role", ["owner", "admin"]);

  if (admins) {
    for (const admin of admins) {
      if ((admin.user_id as string) !== userId) {
        await notifySystem(
          companyId,
          admin.user_id as string,
          `New leave request from ${employeeName}`
        );
      }
    }
  }

  return NextResponse.json({ leave_request: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;
  const body = await request.json();

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "approved" || body.status === "rejected") {
      updateData.approved_by = userId;
    }
  }
  if (body.leave_type) updateData.leave_type = body.leave_type;
  if (body.start_date) updateData.start_date = body.start_date;
  if (body.end_date) updateData.end_date = body.end_date;
  if (body.days != null) updateData.days = body.days;
  if (body.reason !== undefined) updateData.reason = body.reason;

  const { data, error } = await supabase
    .from("hr_leave_requests")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-deduct leave balance on approval
  if (body.status === "approved" && data) {
    const rec = data as Record<string, unknown>;
    const year = new Date(rec.start_date as string).getFullYear();
    const { data: balance } = await supabase
      .from("hr_leave_balances")
      .select("id, used")
      .eq("company_id", companyId)
      .eq("employee_id", rec.employee_id as string)
      .eq("leave_type", rec.leave_type as string)
      .eq("year", year)
      .maybeSingle();

    if (balance) {
      await supabase
        .from("hr_leave_balances")
        .update({ used: (balance.used as number) + (rec.days as number), updated_at: new Date().toISOString() })
        .eq("id", balance.id as string);
    }
  }

  return NextResponse.json({ leave_request: data });
}
