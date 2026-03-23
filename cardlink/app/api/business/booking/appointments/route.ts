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
  const customerId = searchParams.get("customer_id");
  const search = searchParams.get("search");

  let query = supabase
    .from("booking_appointments")
    .select("*, booking_services(name, duration_minutes)")
    .eq("company_id", companyId)
    .order("appointment_date", { ascending: false })
    .order("start_time");

  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);
  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

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
    .select("name, duration_minutes, price, max_concurrent")
    .eq("id", body.service_id)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Calculate end_time from start_time + duration
  const [hours, mins] = (body.start_time as string).split(":").map(Number);
  const totalMins = hours * 60 + mins + (service.duration_minutes as number);
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  // Check for double-booking conflicts
  const { data: conflicts } = await supabase.rpc("check_booking_conflicts", {
    p_company_id: companyId,
    p_service_id: body.service_id,
    p_date: body.appointment_date,
    p_start_time: body.start_time,
    p_end_time: endTime,
  });

  const maxConcurrent = (service.max_concurrent as number) ?? 1;
  if ((conflicts?.length ?? 0) >= maxConcurrent) {
    return NextResponse.json(
      { error: "Time slot conflict: this slot is fully booked" },
      { status: 409 }
    );
  }

  // Get auto_confirm setting
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("auto_confirm")
    .eq("company_id", companyId)
    .maybeSingle();

  const initialStatus = settings?.auto_confirm ? "confirmed" : "pending";

  const { data, error } = await supabase
    .from("booking_appointments")
    .insert({
      company_id: companyId,
      service_id: body.service_id,
      customer_name: body.customer_name,
      customer_email: body.customer_email || null,
      customer_phone: body.customer_phone || null,
      customer_id: body.customer_id || null,
      appointment_date: body.appointment_date,
      start_time: body.start_time,
      end_time: endTime,
      notes: body.notes || null,
      total_price: service.price as number,
      status: initialStatus,
      source: "admin",
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

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.customer_name) updateData.customer_name = body.customer_name;
  if (body.customer_email !== undefined) updateData.customer_email = body.customer_email;
  if (body.customer_phone !== undefined) updateData.customer_phone = body.customer_phone;
  if (body.cancellation_reason !== undefined) updateData.cancellation_reason = body.cancellation_reason;

  // Handle rescheduling: create a new appointment and link it
  if (body.reschedule_date && body.reschedule_time) {
    // Get original appointment
    const { data: original } = await supabase
      .from("booking_appointments")
      .select("*, booking_services(name, duration_minutes, price, max_concurrent)")
      .eq("id", body.id)
      .eq("company_id", companyId)
      .single();

    if (!original) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const svc = original.booking_services as { name: string; duration_minutes: number; price: number; max_concurrent: number } | null;
    const duration = svc?.duration_minutes ?? 60;
    const [rH, rM] = (body.reschedule_time as string).split(":").map(Number);
    const rTotalMins = rH * 60 + rM + duration;
    const rEndTime = `${String(Math.floor(rTotalMins / 60)).padStart(2, "0")}:${String(rTotalMins % 60).padStart(2, "0")}`;

    // Check conflicts for new time
    const { data: conflicts } = await supabase.rpc("check_booking_conflicts", {
      p_company_id: companyId,
      p_service_id: original.service_id,
      p_date: body.reschedule_date,
      p_start_time: body.reschedule_time,
      p_end_time: rEndTime,
    });

    if ((conflicts?.length ?? 0) >= (svc?.max_concurrent ?? 1)) {
      return NextResponse.json(
        { error: "New time slot has conflicts" },
        { status: 409 }
      );
    }

    // Cancel original
    await supabase
      .from("booking_appointments")
      .update({ status: "cancelled", cancellation_reason: "Rescheduled", updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("company_id", companyId);

    // Create new appointment
    const { data: newAppt, error: newError } = await supabase
      .from("booking_appointments")
      .insert({
        company_id: companyId,
        service_id: original.service_id,
        customer_name: original.customer_name,
        customer_email: original.customer_email,
        customer_phone: original.customer_phone,
        customer_id: original.customer_id,
        appointment_date: body.reschedule_date,
        start_time: body.reschedule_time,
        end_time: rEndTime,
        notes: original.notes,
        total_price: original.total_price,
        status: "confirmed",
        source: original.source ?? "admin",
        rescheduled_from_id: body.id,
      })
      .select("*, booking_services(name, duration_minutes)")
      .single();

    if (newError) return NextResponse.json({ error: newError.message }, { status: 500 });
    return NextResponse.json({ appointment: newAppt, rescheduled: true });
  }

  // Regular update
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
