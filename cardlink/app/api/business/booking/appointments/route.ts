import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";
import { notifyNewBooking } from "@/src/lib/business-notifications";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const status = searchParams.get("status");

  let query = supabase
    .from("booking_appointments")
    .select("*, booking_services(name, duration_minutes)")
    .eq("company_id", companyId)
    .order("appointment_date")
    .order("start_time");

  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;
  const body = await request.json();

  // Get service to compute end_time
  const { data: service } = await supabase
    .from("booking_services")
    .select("name, duration_minutes, price")
    .eq("id", body.service_id)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Calculate end_time from start_time + duration
  const [hours, mins] = (body.start_time as string).split(":").map(Number);
  const totalMins = hours * 60 + mins + (service.duration_minutes as number);
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("booking_appointments")
    .insert({
      company_id: companyId,
      service_id: body.service_id,
      customer_name: body.customer_name,
      customer_email: body.customer_email || null,
      customer_phone: body.customer_phone || null,
      appointment_date: body.appointment_date,
      start_time: body.start_time,
      end_time: endTime,
      notes: body.notes || null,
      total_price: service.price as number,
    })
    .select("*, booking_services(name, duration_minutes)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify about new booking
  await notifyNewBooking(
    companyId,
    userId,
    data.id as string,
    body.customer_name as string,
    service.name as string,
    `${body.appointment_date} ${body.start_time}`
  );

  return NextResponse.json({ appointment: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (body.status) {
    updateData.status = body.status;
    updateData.updated_at = new Date().toISOString();
  }
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.customer_name) updateData.customer_name = body.customer_name;
  if (body.customer_email !== undefined) updateData.customer_email = body.customer_email;
  if (body.customer_phone !== undefined) updateData.customer_phone = body.customer_phone;

  const { data, error } = await supabase
    .from("booking_appointments")
    .update(updateData)
    .eq("id", body.id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}
