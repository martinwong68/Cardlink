import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.trim() || "json";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_inventory_valuation", {
    p_company_id: guard.context.activeCompanyId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    sku: r.sku,
    on_hand: r.on_hand,
    cost_price: r.cost_price,
    total_value: r.total_value,
  }));

  const totalValue = rows.reduce((sum, r) => sum + Number(r.total_value), 0);
  const totalItems = rows.reduce((sum, r) => sum + Number(r.on_hand), 0);

  if (format === "csv") {
    const header = "SKU,Product,On Hand,Cost Price,Total Value";
    const csvRows = rows.map((r) =>
      `"${r.sku}","${r.product_name}",${r.on_hand},${r.cost_price},${r.total_value}`
    );
    const csv = [header, ...csvRows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    contract: "inventory.reports.valuation.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    summary: { total_products: rows.length, total_items: totalItems, total_value: totalValue },
    rows,
  });
}
