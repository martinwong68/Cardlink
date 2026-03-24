import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  let query = supabase
    .from("hr_public_holidays")
    .select("*")
    .eq("company_id", companyId);

  if (year) {
    query = query
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", `${year}-12-31`);
  }

  const { data, error } = await query.order("holiday_date");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", holidays: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.name?.trim() || !body.holiday_date)
    return NextResponse.json(
      { error: "name and holiday_date are required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("hr_public_holidays")
    .insert({
      company_id: companyId,
      name: body.name.trim(),
      holiday_date: body.holiday_date,
      country_code: body.country_code || null,
      is_recurring: body.is_recurring ?? false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate public holiday" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", holiday: data }, { status: 201 });
}
