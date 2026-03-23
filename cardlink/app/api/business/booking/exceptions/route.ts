import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");
  const month = searchParams.get("month"); // format: YYYY-MM

  let query = supabase
    .from("booking_exceptions")
    .select("*")
    .eq("company_id", companyId);

  if (staffId) query = query.eq("staff_id", staffId);

  if (month) {
    const [year, mon] = month.split("-");
    const lastDay = new Date(Number(year), Number(mon), 0).getDate();
    query = query
      .gte("exception_date", `${month}-01`)
      .lte("exception_date", `${month}-${String(lastDay).padStart(2, "0")}`);
  }

  const { data, error } = await query.order("exception_date");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", exceptions: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.staff_id || !body.exception_date)
    return NextResponse.json(
      { error: "staff_id and exception_date are required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("booking_exceptions")
    .insert({
      company_id: companyId,
      staff_id: body.staff_id,
      exception_date: body.exception_date,
      is_available: body.is_available ?? false,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      reason: body.reason || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate booking exception" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { status: "ok", exception: data },
    { status: 201 },
  );
}
