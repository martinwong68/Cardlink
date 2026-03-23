import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("complete_stock_take", {
    p_stock_take_id: id,
    p_completed_by: guard.context.user.id,
  });

  if (error) {
    if (error.message.includes("stock_take_not_found")) {
      return NextResponse.json({ error: "stock take not found." }, { status: 404 });
    }
    if (error.message.includes("stock_take_not_completable")) {
      return NextResponse.json({ error: "stock take cannot be completed in current status." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    contract: "inventory.stock_takes.v1",
    status: "completed",
    company_id: guard.context.activeCompanyId,
    stock_take_id: result?.stock_take_id ?? id,
    adjustment_count: result?.adjustment_count ?? 0,
  });
}
