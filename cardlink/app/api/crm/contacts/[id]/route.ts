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

  if (body.first_name !== undefined || body.last_name !== undefined) {
    const firstName = (body.first_name ?? "").trim();
    const lastName = (body.last_name ?? "").trim();
    updates.name = [firstName, lastName].filter(Boolean).join(" ");
  }
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.crm_company_name !== undefined) updates.company_name = body.crm_company_name;
  if (body.job_title !== undefined) updates.position = body.job_title;
  if (body.notes !== undefined) updates.notes = body.notes;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
