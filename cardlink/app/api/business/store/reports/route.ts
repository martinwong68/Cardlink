import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/* ── GET /api/business/store/reports — Store analytics ──── */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "summary";
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const format = url.searchParams.get("format");

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  if (type === "summary") {
    // Overall store performance
    let ordersQuery = supabase
      .from("store_orders")
      .select("id, total, status, payment_status, payment_method, created_at")
      .eq("company_id", companyId);

    if (startDate) ordersQuery = ordersQuery.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) ordersQuery = ordersQuery.lte("created_at", `${endDate}T23:59:59`);

    const { data: orders } = await ordersQuery;
    const allOrders = (orders ?? []) as Array<{ id: string; total: number; status: string; payment_status: string; payment_method: string | null; created_at: string }>;

    const completedOrders = allOrders.filter((o) => ["completed", "delivered"].includes(o.status));
    const refundedOrders = allOrders.filter((o) => o.status === "refunded");
    const cancelledOrders = allOrders.filter((o) => o.status === "cancelled");
    const pendingOrders = allOrders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status));

    const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalRefunds = refundedOrders.reduce((s, o) => s + Number(o.total), 0);
    const netRevenue = totalRevenue - totalRefunds;
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    for (const o of completedOrders) {
      const method = o.payment_method || "unknown";
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
      paymentBreakdown[method].count++;
      paymentBreakdown[method].total += Number(o.total);
    }

    // Top products
    let itemsQuery = supabase
      .from("store_order_items")
      .select("product_name, qty, subtotal, order_id");

    // Filter by completed order IDs
    if (completedOrders.length > 0) {
      const orderIds = completedOrders.map((o) => o.id);
      itemsQuery = itemsQuery.in("order_id", orderIds);
    }

    const { data: items } = await itemsQuery;
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of (items ?? []) as Array<{ product_name: string; qty: number; subtotal: number }>) {
      const existing = productMap.get(item.product_name) ?? { name: item.product_name, qty: 0, revenue: 0 };
      existing.qty += item.qty;
      existing.revenue += Number(item.subtotal);
      productMap.set(item.product_name, existing);
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Customer count
    const { count: customerCount } = await supabase
      .from("store_customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const summary = {
      total_orders: allOrders.length,
      completed_orders: completedOrders.length,
      pending_orders: pendingOrders.length,
      cancelled_orders: cancelledOrders.length,
      refunded_orders: refundedOrders.length,
      total_revenue: totalRevenue,
      total_refunds: totalRefunds,
      net_revenue: netRevenue,
      avg_order_value: avgOrderValue,
      payment_breakdown: paymentBreakdown,
      top_products: topProducts,
      total_customers: customerCount ?? 0,
    };

    if (format === "csv") {
      const lines = [
        "Metric,Value",
        `Total Orders,${summary.total_orders}`,
        `Completed Orders,${summary.completed_orders}`,
        `Pending Orders,${summary.pending_orders}`,
        `Cancelled Orders,${summary.cancelled_orders}`,
        `Refunded Orders,${summary.refunded_orders}`,
        `Total Revenue,$${summary.total_revenue.toFixed(2)}`,
        `Total Refunds,$${summary.total_refunds.toFixed(2)}`,
        `Net Revenue,$${summary.net_revenue.toFixed(2)}`,
        `Avg Order Value,$${summary.avg_order_value.toFixed(2)}`,
        `Total Customers,${summary.total_customers}`,
      ];
      return new NextResponse(lines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=store-report.csv" },
      });
    }

    return NextResponse.json({ type: "summary", summary });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
