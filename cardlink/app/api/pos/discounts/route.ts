import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_discounts")
    .select("id, name, discount_type, value, min_order, is_active, valid_from, valid_until, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "pos.discounts.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    discounts: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = (body.name ?? "").trim();
  const discountType = body.discount_type ?? "percentage";
  const value = Number(body.value ?? 0);

  if (!name || value <= 0) {
    return NextResponse.json({ error: "name and value > 0 are required." }, { status: 400 });
  }

  if (discountType === "percentage" && value > 100) {
    return NextResponse.json({ error: "percentage discount cannot exceed 100." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_discounts")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      discount_type: discountType,
      value,
      min_order: body.min_order ?? 0,
      is_active: body.is_active ?? true,
      valid_from: body.valid_from || null,
      valid_until: body.valid_until || null,
    })
    .select("id, name, discount_type, value, min_order, is_active, valid_from, valid_until")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    {
      contract: "pos.discounts.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      discount: data,
    },
    { status: 201 },
  );
}
