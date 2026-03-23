import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type ReportType = "pipeline" | "conversion" | "forecast" | "activity";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const reportType = (url.searchParams.get("type") ?? "pipeline") as ReportType;
  const companyId = guard.context.activeCompanyId;
  const supabase = await createClient();

  if (!["pipeline", "conversion", "forecast", "activity"].includes(reportType)) {
    return NextResponse.json({ error: "Unsupported report type." }, { status: 400 });
  }

  /* ── Pipeline Summary ── */
  if (reportType === "pipeline") {
    const { data: deals, error } = await supabase
      .from("crm_deals")
      .select("id, stage, value, probability")
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const stages = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"];
    const stageLabels: Record<string, string> = {
      discovery: "Qualification",
      proposal: "Proposal",
      negotiation: "Negotiation",
      closed_won: "Won",
      closed_lost: "Lost",
    };

    const rows = stages.map((stage) => {
      const stageDeals = (deals ?? []).filter((d: any) => d.stage === stage);
      const totalValue = stageDeals.reduce((s: number, d: any) => s + Number(d.value ?? 0), 0);
      const avgProbability = stageDeals.length > 0
        ? stageDeals.reduce((s: number, d: any) => s + Number(d.probability ?? 0), 0) / stageDeals.length
        : 0;
      return {
        stage,
        label: stageLabels[stage] ?? stage,
        count: stageDeals.length,
        total_value: totalValue,
        avg_probability: Math.round(avgProbability),
      };
    });

    const openDeals = (deals ?? []).filter((d: any) => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const totalPipelineValue = openDeals.reduce((s: number, d: any) => s + Number(d.value ?? 0), 0);
    const wonDeals = (deals ?? []).filter((d: any) => d.stage === "closed_won");
    const wonValue = wonDeals.reduce((s: number, d: any) => s + Number(d.value ?? 0), 0);

    return NextResponse.json({
      contract: "crm.reports.pipeline.v1",
      status: "ok",
      company_id: companyId,
      summary: {
        total_deals: (deals ?? []).length,
        open_deals: openDeals.length,
        total_pipeline_value: totalPipelineValue,
        won_deals: wonDeals.length,
        won_value: wonValue,
      },
      rows,
    });
  }

  /* ── Lead Conversion Report ── */
  if (reportType === "conversion") {
    const { data: leads, error } = await supabase
      .from("crm_leads")
      .select("id, status, source, value, created_at")
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const total = (leads ?? []).length;
    const converted = (leads ?? []).filter((l: any) => l.status === "converted").length;
    const lost = (leads ?? []).filter((l: any) => l.status === "lost").length;
    const active = total - converted - lost;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    // Breakdown by source
    const bySource = new Map<string, { total: number; converted: number }>();
    for (const l of (leads ?? []) as any[]) {
      const src = l.source ?? "unknown";
      const current = bySource.get(src) ?? { total: 0, converted: 0 };
      current.total++;
      if (l.status === "converted") current.converted++;
      bySource.set(src, current);
    }

    const sourceRows = Array.from(bySource.entries()).map(([source, stats]) => ({
      source,
      total: stats.total,
      converted: stats.converted,
      conversion_rate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0,
    }));

    return NextResponse.json({
      contract: "crm.reports.conversion.v1",
      status: "ok",
      company_id: companyId,
      summary: {
        total_leads: total,
        converted,
        lost,
        active,
        conversion_rate: conversionRate,
      },
      rows: sourceRows,
    });
  }

  /* ── Revenue Forecast (Weighted Pipeline) ── */
  if (reportType === "forecast") {
    const { data: deals, error } = await supabase
      .from("crm_deals")
      .select("id, title, stage, value, probability, expected_close_date")
      .eq("company_id", companyId)
      .not("stage", "in", "(closed_won,closed_lost)");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (deals ?? []).map((d: any) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: Number(d.value ?? 0),
      probability: Number(d.probability ?? 0),
      weighted_value: Math.round(Number(d.value ?? 0) * Number(d.probability ?? 0) / 100),
      expected_close_date: d.expected_close_date,
    }));

    const totalWeighted = rows.reduce((s: number, r: any) => s + r.weighted_value, 0);
    const totalUnweighted = rows.reduce((s: number, r: any) => s + r.value, 0);

    return NextResponse.json({
      contract: "crm.reports.forecast.v1",
      status: "ok",
      company_id: companyId,
      summary: {
        open_deals: rows.length,
        total_pipeline: totalUnweighted,
        weighted_forecast: totalWeighted,
      },
      rows,
    });
  }

  /* ── Activity Summary ── */
  const { data: activities, error } = await supabase
    .from("crm_activities")
    .select("id, type, status, created_at")
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const types = ["call", "email", "meeting", "task", "note"];
  const rows = types.map((t) => {
    const typeActs = (activities ?? []).filter((a: any) => a.type === t);
    const completed = typeActs.filter((a: any) => a.status === "completed").length;
    return {
      type: t,
      total: typeActs.length,
      completed,
      pending: typeActs.length - completed,
      completion_rate: typeActs.length > 0 ? Math.round((completed / typeActs.length) * 100) : 0,
    };
  });

  const totalActs = (activities ?? []).length;
  const completedActs = (activities ?? []).filter((a: any) => a.status === "completed").length;

  return NextResponse.json({
    contract: "crm.reports.activity.v1",
    status: "ok",
    company_id: companyId,
    summary: {
      total_activities: totalActs,
      completed: completedActs,
      pending: totalActs - completedActs,
      completion_rate: totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0,
    },
    rows,
  });
}
