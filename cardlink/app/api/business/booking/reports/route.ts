import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const format = searchParams.get("format");

  // Default: last 30 days
  const from = dateFrom ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = dateTo ?? new Date().toISOString().slice(0, 10);

  // Fetch appointments in range
  const { data: appointments, error } = await supabase
    .from("booking_appointments")
    .select("*, booking_services(name, duration_minutes, price)")
    .eq("company_id", companyId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date")
    .order("start_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appts = (appointments ?? []) as Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    customer_name: string;
    source: string;
    booking_services: { name: string; duration_minutes: number; price: number } | null;
  }>;

  // Compute summary
  const total = appts.length;
  const completed = appts.filter((a) => a.status === "completed").length;
  const cancelled = appts.filter((a) => a.status === "cancelled").length;
  const noShow = appts.filter((a) => a.status === "no_show").length;
  const pending = appts.filter((a) => a.status === "pending").length;
  const confirmed = appts.filter((a) => a.status === "confirmed").length;

  const revenue = appts
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.total_price ?? 0), 0);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

  // Service breakdown
  const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const a of appts) {
    const svcName = a.booking_services?.name ?? "Unknown";
    if (!serviceMap[svcName]) serviceMap[svcName] = { name: svcName, count: 0, revenue: 0 };
    serviceMap[svcName].count++;
    if (a.status === "completed") serviceMap[svcName].revenue += a.total_price ?? 0;
  }
  const serviceBreakdown = Object.values(serviceMap).sort((a, b) => b.count - a.count);

  // Daily breakdown
  const dailyMap: Record<string, { date: string; count: number; revenue: number }> = {};
  for (const a of appts) {
    const d = a.appointment_date;
    if (!dailyMap[d]) dailyMap[d] = { date: d, count: 0, revenue: 0 };
    dailyMap[d].count++;
    if (a.status === "completed") dailyMap[d].revenue += a.total_price ?? 0;
  }
  const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const summary = {
    date_from: from,
    date_to: to,
    total_appointments: total,
    completed,
    cancelled,
    no_show: noShow,
    pending,
    confirmed,
    revenue,
    completion_rate: completionRate,
    cancellation_rate: cancellationRate,
    no_show_rate: noShowRate,
    service_breakdown: serviceBreakdown,
    daily_breakdown: dailyBreakdown,
  };

  if (format === "csv") {
    const csvHeader = "Date,Customer,Service,Start,End,Status,Price,Source";
    const csvRows = appts.map((a) =>
      [
        a.appointment_date,
        `"${a.customer_name}"`,
        `"${a.booking_services?.name ?? ""}"`,
        a.start_time,
        a.end_time,
        a.status,
        a.total_price,
        a.source ?? "admin",
      ].join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="booking-report-${from}-${to}.csv"`,
      },
    });
  }

  return NextResponse.json({
    contract: "booking/reports",
    status: "ok",
    company_id: companyId,
    summary,
  });
}
