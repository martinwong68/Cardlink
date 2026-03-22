import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_stock_takes")
    .select("id, company_id, warehouse_id, reference_number, status, notes, started_at, completed_at, created_by, completed_by, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.stock_takes.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    stock_takes: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const refNum = body.reference_number?.trim();
  if (!refNum) {
    return NextResponse.json({ error: "reference_number is required." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array is required with at least one product." }, { status: 400 });
  }

  /* Create stock take */
  const { data: st, error: stErr } = await supabase
    .from("inv_stock_takes")
    .insert({
      company_id: guard.context.activeCompanyId,
      warehouse_id: body.warehouse_id?.trim() || null,
      reference_number: refNum,
      status: "in_progress",
      notes: body.notes?.trim() || null,
      started_at: new Date().toISOString(),
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (stErr) {
    const conflict = stErr.code === "23505";
    return NextResponse.json({ error: stErr.message }, { status: conflict ? 409 : 400 });
  }

  /* Fetch current balances for each product and insert items */
  const productIds: string[] = body.items.map((i: { product_id: string }) => i.product_id);
  const { data: balances } = await supabase
    .from("inv_stock_balances")
    .select("product_id, on_hand")
    .eq("company_id", guard.context.activeCompanyId)
    .in("product_id", productIds);

  const balanceMap = new Map((balances ?? []).map((b) => [b.product_id, Number(b.on_hand)]));

  const items = body.items.map((i: { product_id: string; counted_qty?: number }) => ({
    stock_take_id: st.id,
    product_id: i.product_id,
    system_qty: balanceMap.get(i.product_id) ?? 0,
    counted_qty: i.counted_qty ?? null,
  }));

  const { error: itemErr } = await supabase.from("inv_stock_take_items").insert(items);
  if (itemErr) {
    /* Rollback stock take */
    await supabase.from("inv_stock_takes").delete().eq("id", st.id);
    return NextResponse.json({ error: itemErr.message }, { status: 400 });
  }

  return NextResponse.json({
    contract: "inventory.stock_takes.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    stock_take_id: st.id,
    item_count: items.length,
  }, { status: 201 });
}
