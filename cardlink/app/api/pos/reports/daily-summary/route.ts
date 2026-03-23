import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const startDate = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 10);
  const endDate = url.searchParams.get("end") ?? new Date().toISOString().slice(0, 10);
  const format = url.searchParams.get("format"); // optional "csv"

  const supabase = await createClient();

  // Use the RPC function for the report
  const { data, error } = await supabase.rpc("pos_sales_report", {
    p_company_id: guard.context.activeCompanyId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    // Fallback: compute from pos_orders directly if RPC not available
    const { data: orders, error: ordErr } = await supabase
      .from("pos_orders")
      .select("id, total, tax, discount_amount, refund_amount, payment_method, status, created_at")
      .eq("company_id", guard.context.activeCompanyId)
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });

    const rows = orders ?? [];
    const completed = rows.filter((o) => o.status === "completed");
    const refunded = rows.filter((o) => o.status === "refunded");

    const summary = {
      report_date: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
      total_orders: completed.length,
      total_sales: completed.reduce((s, o) => s + Number(o.total ?? 0), 0),
      total_tax: completed.reduce((s, o) => s + Number(o.tax ?? 0), 0),
      total_discounts: completed.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0),
      total_refunds: refunded.reduce((s, o) => s + Number(o.refund_amount ?? o.total ?? 0), 0),
      net_sales: 0,
      cash_sales: completed.filter((o) => o.payment_method === "cash").reduce((s, o) => s + Number(o.total ?? 0), 0),
      card_sales: completed.filter((o) => o.payment_method === "card").reduce((s, o) => s + Number(o.total ?? 0), 0),
      wallet_sales: completed.filter((o) => o.payment_method === "wallet").reduce((s, o) => s + Number(o.total ?? 0), 0),
    };
    summary.net_sales = summary.total_sales - summary.total_refunds;

    if (format === "csv") {
      const csv = [
        "date,total_orders,total_sales,total_tax,total_discounts,total_refunds,net_sales,cash_sales,card_sales,wallet_sales",
        `${summary.report_date},${summary.total_orders},${summary.total_sales},${summary.total_tax},${summary.total_discounts},${summary.total_refunds},${summary.net_sales},${summary.cash_sales},${summary.card_sales},${summary.wallet_sales}`,
      ].join("\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="pos-report-${startDate}.csv"` },
      });
    }

    return NextResponse.json({
      contract: "pos.reports.daily_summary.v1",
      status: "ok",
      company_id: guard.context.activeCompanyId,
      start_date: startDate,
      end_date: endDate,
      summary,
      orders: rows.map((o) => ({
        id: o.id,
        total: o.total,
        tax: o.tax,
        payment_method: o.payment_method,
        status: o.status,
        created_at: o.created_at,
      })),
    });
  }

  // RPC succeeded
  if (format === "csv") {
    const header = "date,total_orders,total_sales,total_tax,total_discounts,total_refunds,net_sales,cash_sales,card_sales,wallet_sales";
    const csvRows = (data ?? []).map((r: Record<string, unknown>) =>
      `${r.report_date},${r.total_orders},${r.total_sales},${r.total_tax},${r.total_discounts},${r.total_refunds},${r.net_sales},${r.cash_sales},${r.card_sales},${r.wallet_sales}`,
    );
    return new NextResponse([header, ...csvRows].join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="pos-report-${startDate}-${endDate}.csv"` },
    });
  }

  return NextResponse.json({
    contract: "pos.reports.daily_summary.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    start_date: startDate,
    end_date: endDate,
    rows: data ?? [],
  });
}
