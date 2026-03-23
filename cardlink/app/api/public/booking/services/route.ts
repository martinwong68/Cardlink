import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Public API: List active booking services for a company.
 * No authentication required — uses public RLS policy.
 * GET /api/public/booking/services?company_id=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from("booking_services")
    .select("id, name, description, duration_minutes, price, category, image_url, buffer_before_mins, buffer_after_mins, max_concurrent")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch booking settings for the company
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("booking_page_title, booking_page_description, require_phone, require_email, timezone")
    .eq("company_id", companyId)
    .maybeSingle();

  return NextResponse.json({
    services: services ?? [],
    settings: settings ?? {
      booking_page_title: null,
      booking_page_description: null,
      require_phone: false,
      require_email: true,
      timezone: "Asia/Kuala_Lumpur",
    },
  });
}
