import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/* ── PATCH /api/business/store/coupons/[id] — Update coupon ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.code !== undefined) updates.code = (body.code as string).toUpperCase().trim();
  if (body.name !== undefined) updates.name = body.name;
  if (body.discount_type !== undefined) updates.discount_type = body.discount_type;
  if (body.discount_value !== undefined) updates.discount_value = body.discount_value;
  if (body.min_order_amount !== undefined) updates.min_order_amount = body.min_order_amount;
  if (body.max_discount !== undefined) updates.max_discount = body.max_discount;
  if (body.applies_to !== undefined) updates.applies_to = body.applies_to;
  if (body.target_id !== undefined) updates.target_id = body.target_id;
  if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit;
  if (body.per_customer_limit !== undefined) updates.per_customer_limit = body.per_customer_limit;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.valid_from !== undefined) updates.valid_from = body.valid_from;
  if (body.valid_until !== undefined) updates.valid_until = body.valid_until;

  const { data, error } = await supabase
    .from("store_coupons")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ coupon: data });
}

/* ── DELETE /api/business/store/coupons/[id] — Delete coupon ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("store_coupons")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
