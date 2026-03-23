import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.trim() || "json";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_low_stock_products", {
    p_company_id: guard.context.activeCompanyId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    sku: r.sku,
    on_hand: r.on_hand,
    reorder_level: r.reorder_level,
    deficit: r.deficit,
  }));

  if (format === "csv") {
    const header = "SKU,Product,On Hand,Reorder Level,Deficit";
    const csvRows = rows.map((r) =>
      `"${r.sku}","${r.product_name}",${r.on_hand},${r.reorder_level},${r.deficit}`
    );
    const csv = [header, ...csvRows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="low-stock-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    contract: "inventory.reports.low_stock.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    total_low_stock: rows.length,
    rows,
  });
}
