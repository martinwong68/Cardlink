import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/* ── GET /api/business/store/coupons — List coupons ──────── */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_coupons")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ coupons: data ?? [] });
}

/* ── POST /api/business/store/coupons — Create coupon ────── */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_coupons")
    .insert({
      company_id: guard.context.activeCompanyId,
      code: (body.code as string).toUpperCase().trim(),
      name: body.name ?? null,
      discount_type: body.discount_type ?? "percentage",
      discount_value: body.discount_value ?? 0,
      min_order_amount: body.min_order_amount ?? 0,
      max_discount: body.max_discount ?? null,
      applies_to: body.applies_to ?? "all",
      target_id: body.target_id ?? null,
      usage_limit: body.usage_limit ?? null,
      per_customer_limit: body.per_customer_limit ?? 1,
      is_active: body.is_active ?? true,
      valid_from: body.valid_from ?? null,
      valid_until: body.valid_until ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ coupon: data }, { status: 201 });
}
