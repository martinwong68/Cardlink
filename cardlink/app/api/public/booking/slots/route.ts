import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Public API: Get available time slots for a service on a specific date.
 * No authentication required — uses the get_available_slots RPC.
 * GET /api/public/booking/slots?company_id=...&service_id=...&date=YYYY-MM-DD
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");
  const serviceId = searchParams.get("service_id");
  const date = searchParams.get("date");

  if (!companyId || !serviceId || !date) {
    return NextResponse.json(
      { error: "company_id, service_id, and date are required" },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD format" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check service min_notice_hours
  const { data: service } = await supabase
    .from("booking_services")
    .select("min_notice_hours, max_advance_days, duration_minutes")
    .eq("id", serviceId)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
  }

  // Enforce min notice
  const requestedDate = new Date(date + "T00:00:00Z");
  const now = new Date();
  const minNoticeMs = (service.min_notice_hours ?? 0) * 3600000;
  if (requestedDate.getTime() < now.getTime() + minNoticeMs - 86400000) {
    return NextResponse.json({
      slots: [],
      message: `Minimum ${service.min_notice_hours} hours notice required`,
    });
  }

  // Enforce max advance days
  const maxAdvanceMs = (service.max_advance_days ?? 90) * 86400000;
  if (requestedDate.getTime() > now.getTime() + maxAdvanceMs) {
    return NextResponse.json({
      slots: [],
      message: `Cannot book more than ${service.max_advance_days} days in advance`,
    });
  }

  // Call the RPC function
  const { data: slots, error } = await supabase.rpc("get_available_slots", {
    p_company_id: companyId,
    p_service_id: serviceId,
    p_date: date,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    slots: (slots ?? []).map((s: { slot_start: string; slot_end: string }) => ({
      start: s.slot_start,
      end: s.slot_end,
    })),
    service_duration_minutes: service.duration_minutes,
    date,
  });
}
