import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_shifts")
    .update({
      status: "closed",
      closing_cash: body.closing_cash ?? 0,
      ended_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .eq("status", "open")
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
      total_sales: data.expected_cash ?? 0,
      opened_at: data.started_at,
      closed_at: data.ended_at,
    },
  });
}
