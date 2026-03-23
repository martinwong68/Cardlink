import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.discount_type !== undefined) updates.discount_type = body.discount_type;
  if (body.value !== undefined) updates.value = body.value;
  if (body.min_order !== undefined) updates.min_order = body.min_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.valid_from !== undefined) updates.valid_from = body.valid_from;
  if (body.valid_until !== undefined) updates.valid_until = body.valid_until;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("pos_discounts")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ discount: data });
}
