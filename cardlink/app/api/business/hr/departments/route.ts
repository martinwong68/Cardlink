import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const isActive = searchParams.get("is_active");

  let query = supabase
    .from("hr_departments")
    .select("*")
    .eq("company_id", companyId);

  if (isActive !== null) query = query.eq("is_active", isActive === "true");

  const { data, error } = await query.order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", departments: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hr_departments")
    .insert({
      company_id: companyId,
      name: body.name.trim(),
      code: body.code || null,
      description: body.description || null,
      manager_id: body.manager_id || null,
      parent_department_id: body.parent_department_id || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Department already exists" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", department: data }, { status: 201 });
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
  if (body.name !== undefined) updateData.name = body.name?.trim();
  if (body.code !== undefined) updateData.code = body.code || null;
  if (body.description !== undefined)
    updateData.description = body.description || null;
  if (body.manager_id !== undefined)
    updateData.manager_id = body.manager_id || null;
  if (body.parent_department_id !== undefined)
    updateData.parent_department_id = body.parent_department_id || null;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  const { data, error } = await supabase
    .from("hr_departments")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", department: data });
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("hr_departments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
