import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = await createClient();
  let query = supabase
    .from("pos_shifts")
    .select("id, register_id, status, opening_cash, closing_cash, expected_cash, variance, notes, started_at, ended_at, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("started_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shifts = (data ?? []).map((s) => ({
    id: s.id,
    register_id: s.register_id,
    status: s.status,
    opening_cash: s.opening_cash,
    closing_cash: s.closing_cash,
    total_sales: s.expected_cash ?? 0,
    opened_at: s.started_at,
    closed_at: s.ended_at,
  }));

  return NextResponse.json({ shifts });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_shifts")
    .insert({
      company_id: guard.context.activeCompanyId,
      register_id: body.register_id || null,
      user_id: guard.context.user.id,
      opening_cash: body.opening_cash ?? 0,
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    shift: {
      id: data.id,
      register_id: data.register_id,
      status: data.status,
      opening_cash: data.opening_cash,
      closing_cash: data.closing_cash,
      total_sales: 0,
      opened_at: data.started_at,
      closed_at: data.ended_at,
    },
  }, { status: 201 });
}
