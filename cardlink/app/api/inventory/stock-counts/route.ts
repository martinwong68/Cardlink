import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || null;
  const warehouseId = url.searchParams.get("warehouse_id")?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("inv_stock_counts")
    .select("*")
    .eq("company_id", guard.context.organizationId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (warehouseId) query = query.eq("warehouse_id", warehouseId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.stock_counts.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    stock_counts: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const warehouseId = body.warehouse_id?.trim();

  const countNumber = body.count_number?.trim();

  if (!warehouseId) {
    return NextResponse.json({ error: "warehouse_id is required." }, { status: 400 });
  }
  if (!countNumber) {
    return NextResponse.json({ error: "count_number is required." }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json(
      { error: "lines array is required with at least one entry." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Create the stock count header
  const { data: sc, error: scErr } = await supabase
    .from("inv_stock_counts")
    .insert({
      company_id: guard.context.organizationId,
      warehouse_id: warehouseId,
      count_number: countNumber,
      count_date: body.count_date || new Date().toISOString().slice(0, 10),
      status: "draft",
      notes: body.notes?.trim() || null,
      counted_by: guard.context.userId,
    })
    .select("id")
    .single();

  if (scErr) {
    const conflict = scErr.code === "23505";
    return NextResponse.json({ error: scErr.message }, { status: conflict ? 409 : 400 });
  }

  // Insert count lines
  const lines = body.lines.map(
    (l: { product_id: string; system_qty?: number; counted_qty?: number }) => ({
      count_id: sc.id,
      product_id: l.product_id,
      system_qty: l.system_qty ?? 0,
      counted_qty: l.counted_qty ?? null,
    }),
  );

  const { error: lineErr } = await supabase.from("inv_stock_count_lines").insert(lines);
  if (lineErr) {
    // Rollback: delete the parent stock count
    await supabase.from("inv_stock_counts").delete().eq("id", sc.id);
    return NextResponse.json({ error: lineErr.message }, { status: 400 });
  }

  return NextResponse.json({
    contract: "inventory.stock_counts.v1",
    status: "created",
    organization_id: guard.context.organizationId,
    stock_count_id: sc.id,
    line_count: lines.length,
  }, { status: 201 });
}
