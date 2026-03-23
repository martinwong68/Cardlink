import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Public API: Create a booking appointment (customer self-service).
 * No authentication required.
 * POST /api/public/booking/book
 */
export async function POST(request: Request) {
  const body = await request.json();

  const { company_id, service_id, customer_name, customer_email, customer_phone, date, start_time, notes } = body;

  if (!company_id || !service_id || !customer_name || !date || !start_time) {
    return NextResponse.json(
      { error: "company_id, service_id, customer_name, date, and start_time are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Get service details
  const { data: service } = await supabase
    .from("booking_services")
    .select("id, name, duration_minutes, price, min_notice_hours, max_advance_days, is_active")
    .eq("id", service_id)
    .eq("company_id", company_id)
    .single();

  if (!service || !service.is_active) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
  }

  // Calculate end_time
  const [hours, mins] = (start_time as string).split(":").map(Number);
  const totalMins = hours * 60 + mins + (service.duration_minutes as number);
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  // Check for conflicts using RPC
  const { data: conflicts } = await supabase.rpc("check_booking_conflicts", {
    p_company_id: company_id,
    p_service_id: service_id,
    p_date: date,
    p_start_time: start_time,
    p_end_time: endTime,
  });

  // Check max_concurrent
  const { data: svcDetail } = await supabase
    .from("booking_services")
    .select("max_concurrent")
    .eq("id", service_id)
    .single();

  const maxConcurrent = svcDetail?.max_concurrent ?? 1;
  if ((conflicts?.length ?? 0) >= maxConcurrent) {
    return NextResponse.json(
      { error: "This time slot is no longer available. Please choose another time." },
      { status: 409 }
    );
  }

  // Get booking settings for auto_confirm
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("auto_confirm, require_phone, require_email")
    .eq("company_id", company_id)
    .maybeSingle();

  // Validate required fields per settings
  if (settings?.require_email && !customer_email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (settings?.require_phone && !customer_phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const initialStatus = settings?.auto_confirm ? "confirmed" : "pending";

  // Find or create booking customer
  let customerId: string | null = null;
  if (customer_email) {
    const { data: existingCustomer } = await supabase
      .from("booking_customers")
      .select("id")
      .eq("company_id", company_id)
      .eq("email", customer_email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id as string;
      // Update stats
      await supabase
        .from("booking_customers")
        .update({
          name: customer_name,
          phone: customer_phone || null,
          total_bookings: ((existingCustomer as Record<string, unknown>).total_bookings as number) + 1,
          last_visit_date: date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from("booking_customers")
        .insert({
          company_id,
          name: customer_name,
          email: customer_email || null,
          phone: customer_phone || null,
          total_bookings: 1,
          last_visit_date: date,
        })
        .select("id")
        .single();
      customerId = newCustomer?.id as string ?? null;
    }
  }

  // Create appointment
  const { data: appointment, error } = await supabase
    .from("booking_appointments")
    .insert({
      company_id,
      service_id,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      customer_id: customerId,
      appointment_date: date,
      start_time,
      end_time: endTime,
      notes: notes || null,
      total_price: service.price as number,
      status: initialStatus,
      source: "public",
    })
    .select("id, appointment_date, start_time, end_time, status, total_price")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    appointment,
    service_name: service.name,
    message: initialStatus === "confirmed"
      ? "Your appointment is confirmed!"
      : "Your appointment is pending confirmation. We'll notify you shortly.",
  }, { status: 201 });
}
