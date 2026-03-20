import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("hr_attendance")
    .select("*, hr_employees(full_name)")
    .eq("company_id", companyId)
    .eq("date", date)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  // Clock in
  if (body.action === "clock_in") {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data, error } = await supabase
      .from("hr_attendance")
      .upsert(
        {
          company_id: companyId,
          employee_id: body.employee_id,
          date: today,
          clock_in: now,
          status: "present",
        },
        { onConflict: "employee_id,date" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attendance: data });
  }

  // Clock out
  if (body.action === "clock_out") {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // First get the record to calculate hours
    const { data: existing } = await supabase
      .from("hr_attendance")
      .select("clock_in")
      .eq("employee_id", body.employee_id)
      .eq("date", today)
      .eq("company_id", companyId)
      .maybeSingle();

    let hoursWorked: number | null = null;
    if (existing?.clock_in) {
      const clockIn = new Date(existing.clock_in as string);
      const clockOut = new Date(now);
      hoursWorked = Math.round(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    }

    const { data, error } = await supabase
      .from("hr_attendance")
      .update({
        clock_out: now,
        hours_worked: hoursWorked,
      })
      .eq("employee_id", body.employee_id)
      .eq("date", today)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attendance: data });
  }

  // Mark status (absent/late/half_day)
  if (body.action === "mark_status") {
    const date = body.date || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("hr_attendance")
      .upsert(
        {
          company_id: companyId,
          employee_id: body.employee_id,
          date,
          status: body.status,
          notes: body.notes || null,
        },
        { onConflict: "employee_id,date" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attendance: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
