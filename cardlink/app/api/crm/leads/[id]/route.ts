import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.name = body.title;
  if (body.source !== undefined) updates.source = body.source;
  if (body.status !== undefined) updates.status = body.status;
  if (body.value !== undefined) updates.value = body.value;
  if (body.notes !== undefined) updates.notes = body.notes;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_leads")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
