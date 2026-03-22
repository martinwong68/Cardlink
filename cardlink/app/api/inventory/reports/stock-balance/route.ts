import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const warehouseId = url.searchParams.get("warehouse_id")?.trim() || null;
  const format = url.searchParams.get("format")?.trim() || "json";

  const supabase = await createClient();
  let query = supabase
    .from("inv_stock_balances")
    .select("product_id, company_id, on_hand, warehouse_id, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("updated_at", { ascending: false });

  if (warehouseId) query = query.eq("warehouse_id", warehouseId);

  const { data: balances, error: bErr } = await query;
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  /* Enrich with product info */
  const productIds = [...new Set((balances ?? []).map((b) => b.product_id))];
  const { data: products } = await supabase
    .from("inv_products")
    .select("id, sku, name, unit, cost_price, sell_price, category_id")
    .in("id", productIds.length > 0 ? productIds : ["__none__"]);

  const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

  const rows = (balances ?? []).map((b) => {
    const p = prodMap.get(b.product_id);
    return {
      product_id: b.product_id,
      sku: p?.sku ?? "",
      name: p?.name ?? "",
      unit: p?.unit ?? "",
      on_hand: b.on_hand,
      cost_price: p?.cost_price ?? 0,
      stock_value: Number(b.on_hand) * Number(p?.cost_price ?? 0),
      warehouse_id: b.warehouse_id,
      updated_at: b.updated_at,
    };
  });

  if (format === "csv") {
    const header = "SKU,Name,Unit,On Hand,Cost Price,Stock Value,Updated At";
    const csvRows = rows.map((r) =>
      `"${r.sku}","${r.name}","${r.unit}",${r.on_hand},${r.cost_price},${r.stock_value},${r.updated_at}`
    );
    const csv = [header, ...csvRows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stock-balance-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const totalValue = rows.reduce((sum, r) => sum + r.stock_value, 0);
  const totalItems = rows.reduce((sum, r) => sum + Number(r.on_hand), 0);

  return NextResponse.json({
    contract: "inventory.reports.stock_balance.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    summary: { total_products: rows.length, total_items: totalItems, total_value: totalValue },
    rows,
  });
}
