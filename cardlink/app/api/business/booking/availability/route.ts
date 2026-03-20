import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service_id");

  let query = supabase
    .from("booking_availability")
    .select("*")
    .eq("company_id", companyId)
    .order("day_of_week")
    .order("start_time");

  if (serviceId) query = query.eq("service_id", serviceId);
  else query = query.is("service_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ availability: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  // Bulk save: receives an array of availability slots for all 7 days
  if (Array.isArray(body.slots)) {
    // Delete existing availability for this scope
    let deleteQuery = supabase
      .from("booking_availability")
      .delete()
      .eq("company_id", companyId);

    if (body.service_id) {
      deleteQuery = deleteQuery.eq("service_id", body.service_id);
    } else {
      deleteQuery = deleteQuery.is("service_id", null);
    }

    await deleteQuery;

    const rows = (body.slots as Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }>)
      .filter((s) => s.is_available)
      .map((s) => ({
        company_id: companyId,
        service_id: body.service_id || null,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: true,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("booking_availability").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ error: "slots array is required" }, { status: 400 });
}
