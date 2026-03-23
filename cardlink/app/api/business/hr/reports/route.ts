import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get("type") || "headcount";

  if (reportType === "headcount") {
    const { data: employees } = await supabase
      .from("hr_employees")
      .select("status, department, employment_type")
      .eq("company_id", companyId);

    const total = employees?.length ?? 0;
    const active = employees?.filter((e) => e.status === "active").length ?? 0;
    const inactive = employees?.filter((e) => e.status === "inactive").length ?? 0;
    const terminated = employees?.filter((e) => e.status === "terminated").length ?? 0;

    // By department
    const byDepartment: Record<string, number> = {};
    employees?.forEach((e) => {
      const dept = (e.department as string) || "Unassigned";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    // By employment type
    const byType: Record<string, number> = {};
    employees?.forEach((e) => {
      const t = e.employment_type as string;
      byType[t] = (byType[t] || 0) + 1;
    });

    return NextResponse.json({
      report: "headcount",
      data: { total, active, inactive, terminated, byDepartment, byType },
    });
  }

  if (reportType === "attendance") {
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const endDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0)
      .toISOString()
      .slice(0, 10);

    const { data: records } = await supabase
      .from("hr_attendance")
      .select("employee_id, status, hours_worked")
      .eq("company_id", companyId)
      .gte("date", startDate)
      .lte("date", endDate);

    const totalRecords = records?.length ?? 0;
    const presentDays = records?.filter((r) => r.status === "present").length ?? 0;
    const absentDays = records?.filter((r) => r.status === "absent").length ?? 0;
    const lateDays = records?.filter((r) => r.status === "late").length ?? 0;
    const totalHours = records?.reduce((sum, r) => sum + ((r.hours_worked as number) || 0), 0) ?? 0;

    return NextResponse.json({
      report: "attendance",
      data: { month, totalRecords, presentDays, absentDays, lateDays, totalHours: Math.round(totalHours * 100) / 100 },
    });
  }

  if (reportType === "leave") {
    const year = searchParams.get("year") || String(new Date().getFullYear());

    const { data: balances } = await supabase
      .from("hr_leave_balances")
      .select("leave_type, entitlement, used, carried_over")
      .eq("company_id", companyId)
      .eq("year", parseInt(year));

    const byType: Record<string, { entitlement: number; used: number; remaining: number }> = {};
    balances?.forEach((b) => {
      const lt = b.leave_type as string;
      if (!byType[lt]) byType[lt] = { entitlement: 0, used: 0, remaining: 0 };
      byType[lt].entitlement += (b.entitlement as number) + (b.carried_over as number);
      byType[lt].used += b.used as number;
      byType[lt].remaining += (b.entitlement as number) + (b.carried_over as number) - (b.used as number);
    });

    return NextResponse.json({ report: "leave", data: { year, byType } });
  }

  if (reportType === "payroll") {
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");

    let query = supabase
      .from("hr_payroll")
      .select("basic_salary, overtime, deductions, allowances, net_pay, status")
      .eq("company_id", companyId);

    if (periodStart) query = query.gte("period_start", periodStart);
    if (periodEnd) query = query.lte("period_end", periodEnd);

    const { data: payroll } = await query;

    const totalBasic = payroll?.reduce((s, r) => s + ((r.basic_salary as number) || 0), 0) ?? 0;
    const totalOvertime = payroll?.reduce((s, r) => s + ((r.overtime as number) || 0), 0) ?? 0;
    const totalDeductions = payroll?.reduce((s, r) => s + ((r.deductions as number) || 0), 0) ?? 0;
    const totalAllowances = payroll?.reduce((s, r) => s + ((r.allowances as number) || 0), 0) ?? 0;
    const totalNetPay = payroll?.reduce((s, r) => s + ((r.net_pay as number) || 0), 0) ?? 0;
    const recordCount = payroll?.length ?? 0;

    return NextResponse.json({
      report: "payroll",
      data: { totalBasic, totalOvertime, totalDeductions, totalAllowances, totalNetPay, recordCount },
    });
  }

  return NextResponse.json({ error: "Invalid report type. Use: headcount, attendance, leave, payroll" }, { status: 400 });
}
