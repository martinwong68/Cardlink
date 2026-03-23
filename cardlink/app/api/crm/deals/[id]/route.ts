import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const STAGE_FE_TO_DB: Record<string, string> = {
  qualification: "discovery",
  proposal: "proposal",
  negotiation: "negotiation",
  closing: "negotiation",
  won: "closed_won",
  lost: "closed_lost",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.value !== undefined) updates.value = body.value;
  if (body.stage !== undefined) updates.stage = STAGE_FE_TO_DB[body.stage] ?? body.stage;
  if (body.probability !== undefined) updates.probability = body.probability;
  if (body.expected_close_date !== undefined) updates.expected_close_date = body.expected_close_date;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.contact_id !== undefined) updates.contact_id = body.contact_id;
  if (body.lost_reason !== undefined) updates.lost_reason = body.lost_reason;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
