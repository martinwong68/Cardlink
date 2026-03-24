import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const registerId = searchParams.get("register_id");

  let query = supabase
    .from("pos_daily_summaries")
    .select("*")
    .eq("company_id", companyId)
    .eq("summary_date", date);

  if (registerId) query = query.eq("register_id", registerId);

  const { data, error } = await query.maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    return NextResponse.json({ status: "ok", summary: data });
  }

  // No stored summary — calculate from pos_orders
  let ordersQuery = supabase
    .from("pos_orders")
    .select("total, status, payment_method")
    .eq("company_id", companyId)
    .gte("created_at", `${date}T00:00:00`)
    .lt("created_at", `${date}T23:59:59.999`);

  if (registerId) ordersQuery = ordersQuery.eq("register_id", registerId);

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError)
    return NextResponse.json({ error: ordersError.message }, { status: 500 });

  const rows = orders ?? [];
  const completedOrders = rows.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + ((o.total as number) || 0),
    0,
  );

  const paymentBreakdown: Record<string, number> = {};
  for (const o of completedOrders) {
    const method = (o.payment_method as string) || "unknown";
    paymentBreakdown[method] =
      (paymentBreakdown[method] || 0) + ((o.total as number) || 0);
  }

  const calculated = {
    company_id: companyId,
    summary_date: date,
    register_id: registerId,
    total_orders: rows.length,
    completed_orders: completedOrders.length,
    total_revenue: totalRevenue,
    payment_breakdown: paymentBreakdown,
    is_calculated: true,
  };

  return NextResponse.json({ status: "ok", summary: calculated });
}
