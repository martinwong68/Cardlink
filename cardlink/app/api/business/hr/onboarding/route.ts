import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("hr_onboarding_tasks")
    .select("*")
    .eq("company_id", companyId);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("sort_order").order("created_at");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", tasks: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.employee_id || !body.task_name?.trim())
    return NextResponse.json(
      { error: "employee_id and task_name are required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("hr_onboarding_tasks")
    .insert({
      company_id: companyId,
      employee_id: body.employee_id,
      task_name: body.task_name.trim(),
      description: body.description || null,
      due_date: body.due_date || null,
      assigned_to: body.assigned_to || null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate onboarding task" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", task: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.id || !body.status)
    return NextResponse.json(
      { error: "id and status are required" },
      { status: 400 },
    );

  const updateData: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };

  if (body.status === "completed") {
    updateData.completed_at = body.completed_at || new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("hr_onboarding_tasks")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", task: data });
}
