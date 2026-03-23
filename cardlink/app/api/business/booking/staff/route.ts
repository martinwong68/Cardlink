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
    .from("booking_staff")
    .select("*")
    .eq("company_id", companyId);

  if (isActive !== null) query = query.eq("is_active", isActive === "true");

  const { data, error } = await query.order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", staff: data });
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
    .from("booking_staff")
    .insert({
      company_id: companyId,
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      specializations: body.specializations ?? [],
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Staff member already exists" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", staff: data }, { status: 201 });
}
