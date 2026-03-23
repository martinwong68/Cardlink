import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");

  if (!orderId)
    return NextResponse.json(
      { error: "order_id is required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("pos_payment_splits")
    .select("*")
    .eq("company_id", companyId)
    .eq("order_id", orderId)
    .order("created_at");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", splits: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.order_id || !body.payment_method || body.amount == null)
    return NextResponse.json(
      { error: "order_id, payment_method, and amount are required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("pos_payment_splits")
    .insert({
      company_id: companyId,
      order_id: body.order_id,
      payment_method: body.payment_method,
      amount: body.amount,
      reference: body.reference || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate split payment" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", split: data }, { status: 201 });
}
