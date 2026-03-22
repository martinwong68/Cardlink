import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id")?.trim() || null;
  const movementType = url.searchParams.get("movement_type")?.trim() || null;
  const dateFrom = url.searchParams.get("date_from")?.trim() || null;
  const dateTo = url.searchParams.get("date_to")?.trim() || null;
  const format = url.searchParams.get("format")?.trim() || "json";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 1000);

  const supabase = await createClient();
  let query = supabase
    .from("inv_stock_movements")
    .select("id, product_id, movement_type, qty, reason, reference_type, reference_id, created_by, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) query = query.eq("product_id", productId);
  if (movementType) query = query.eq("movement_type", movementType);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: movements, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Enrich with product names */
  const productIds = [...new Set((movements ?? []).map((m) => m.product_id))];
  const { data: products } = await supabase
    .from("inv_products")
    .select("id, sku, name")
    .in("id", productIds.length > 0 ? productIds : ["__none__"]);

  const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

  const rows = (movements ?? []).map((m) => {
    const p = prodMap.get(m.product_id);
    return {
      id: m.id,
      product_id: m.product_id,
      sku: p?.sku ?? "",
      product_name: p?.name ?? "",
      movement_type: m.movement_type,
      qty: m.qty,
      reason: m.reason,
      reference_type: m.reference_type,
      reference_id: m.reference_id,
      created_at: m.created_at,
    };
  });

  if (format === "csv") {
    const header = "Date,SKU,Product,Type,Qty,Reason,Reference Type,Reference ID";
    const csvRows = rows.map((r) =>
      `"${r.created_at}","${r.sku}","${r.product_name}","${r.movement_type}",${r.qty},"${r.reason ?? ""}","${r.reference_type ?? ""}","${r.reference_id ?? ""}"`
    );
    const csv = [header, ...csvRows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="movement-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const summary = {
    total_movements: rows.length,
    total_in: rows.filter((r) => r.movement_type === "in").reduce((s, r) => s + Number(r.qty), 0),
    total_out: rows.filter((r) => r.movement_type === "out").reduce((s, r) => s + Number(r.qty), 0),
    total_adjust: rows.filter((r) => r.movement_type === "adjust").reduce((s, r) => s + Number(r.qty), 0),
  };

  return NextResponse.json({
    contract: "inventory.reports.movement_history.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    summary,
    rows,
  });
}
