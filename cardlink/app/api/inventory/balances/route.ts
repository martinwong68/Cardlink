import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id")?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("inv_stock_balances")
    .select("product_id, company_id, on_hand, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("updated_at", { ascending: false });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "inventory.balances.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    balances: data ?? [],
  });
}
