import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("booking_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return defaults if no settings row exists
  const settings = data ?? {
    company_id: companyId,
    auto_confirm: false,
    timezone: "Asia/Kuala_Lumpur",
    slot_interval_mins: 30,
    cancellation_notice_hours: 0,
    cancellation_policy: null,
    booking_page_title: null,
    booking_page_description: null,
    require_phone: false,
    require_email: true,
  };

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  const payload = {
    company_id: companyId,
    auto_confirm: body.auto_confirm ?? false,
    timezone: body.timezone ?? "Asia/Kuala_Lumpur",
    slot_interval_mins: body.slot_interval_mins ?? 30,
    cancellation_notice_hours: body.cancellation_notice_hours ?? 0,
    cancellation_policy: body.cancellation_policy || null,
    booking_page_title: body.booking_page_title || null,
    booking_page_description: body.booking_page_description || null,
    require_phone: body.require_phone ?? false,
    require_email: body.require_email ?? true,
    updated_at: new Date().toISOString(),
  };

  // Upsert: insert or update on conflict
  const { data: existing } = await supabase
    .from("booking_settings")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from("booking_settings")
      .update(payload)
      .eq("company_id", companyId)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("booking_settings")
      .insert(payload)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
