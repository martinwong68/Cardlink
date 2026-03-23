import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/* ── GET /api/business/store/customers/[id] — Customer detail ── */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("store_customers")
    .select("*")
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  // Fetch customer orders
  const { data: orders } = await supabase
    .from("store_orders")
    .select("id, order_number, total, status, payment_status, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ customer, orders: orders ?? [] });
}

/* ── PATCH /api/business/store/customers/[id] — Update ── */
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
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.addresses !== undefined) updates.addresses = body.addresses;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await supabase
    .from("store_customers")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customer: data });
}

/* ── DELETE /api/business/store/customers/[id] — Delete ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("store_customers")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
