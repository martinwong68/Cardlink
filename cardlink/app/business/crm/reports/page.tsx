"use client";

import { useEffect, useState, useCallback } from "react";

type ReportTab = "pipeline" | "conversion" | "forecast" | "activity";

type PipelineRow = { stage: string; label: string; count: number; total_value: number; avg_probability: number };
type ConversionRow = { source: string; total: number; converted: number; conversion_rate: number };
type ForecastRow = { id: string; title: string; stage: string; value: number; probability: number; weighted_value: number; expected_close_date: string | null };
type ActivityRow = { type: string; total: number; completed: number; pending: number; completion_rate: number };

type PipelineData = { summary: { total_deals: number; open_deals: number; total_pipeline_value: number; won_deals: number; won_value: number }; rows: PipelineRow[] };
type ConversionData = { summary: { total_leads: number; converted: number; lost: number; active: number; conversion_rate: number }; rows: ConversionRow[] };
type ForecastData = { summary: { open_deals: number; total_pipeline: number; weighted_forecast: number }; rows: ForecastRow[] };
type ActivityData = { summary: { total_activities: number; completed: number; pending: number; completion_rate: number }; rows: ActivityRow[] };

const TABS: { key: ReportTab; label: string }[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "conversion", label: "Conversion" },
  { key: "forecast", label: "Forecast" },
  { key: "activity", label: "Activity" },
];

const STAGE_COLORS: Record<string, string> = {
  discovery: "bg-blue-500", proposal: "bg-indigo-500", negotiation: "bg-amber-500", closed_won: "bg-green-500", closed_lost: "bg-rose-500",
};

export default function CrmReportsPage() {
  const [tab, setTab] = useState<ReportTab>("pipeline");
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [conversion, setConversion] = useState<ConversionData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);

  const headers = { "x-cardlink-app-scope": "business" };

  const loadReport = useCallback(async (type: ReportTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/reports?type=${type}`, { headers, cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (type === "pipeline") setPipeline(data);
      else if (type === "conversion") setConversion(data);
      else if (type === "forecast") setForecast(data);
      else if (type === "activity") setActivity(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(tab); }, [tab, loadReport]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">CRM Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab === t.key ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><p className="text-sm text-gray-500">Loading report…</p></div>}

      {/* ── Pipeline Report ── */}
      {!loading && tab === "pipeline" && pipeline && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Total Deals" value={pipeline.summary.total_deals} />
            <KPI label="Open Deals" value={pipeline.summary.open_deals} />
            <KPI label="Pipeline Value" value={`$${pipeline.summary.total_pipeline_value.toLocaleString()}`} />
            <KPI label="Won Value" value={`$${pipeline.summary.won_value.toLocaleString()}`} accent="text-green-700" />
          </div>
          {/* Stage breakdown */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Pipeline by Stage</p>
            <div className="space-y-3">
              {pipeline.rows.map((r) => {
                const maxVal = Math.max(...pipeline.rows.map((x) => x.total_value), 1);
                const pct = Math.round((r.total_value / maxVal) * 100);
                return (
                  <div key={r.stage}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{r.label}</span>
                      <span className="text-gray-500">{r.count} deals · ${r.total_value.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div className={`h-2 rounded-full ${STAGE_COLORS[r.stage] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Conversion Report ── */}
      {!loading && tab === "conversion" && conversion && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Total Leads" value={conversion.summary.total_leads} />
            <KPI label="Converted" value={conversion.summary.converted} accent="text-green-700" />
            <KPI label="Lost" value={conversion.summary.lost} accent="text-rose-700" />
            <KPI label="Conversion Rate" value={`${conversion.summary.conversion_rate}%`} accent="text-indigo-700" />
          </div>
          {/* Source breakdown */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">By Lead Source</p>
            {conversion.rows.length === 0 ? (
              <p className="text-sm text-gray-400">No lead data</p>
            ) : (
              <div className="space-y-2">
                {conversion.rows.map((r) => (
                  <div key={r.source} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm font-medium capitalize text-gray-700">{r.source}</span>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{r.total} leads</span>
                      <span>{r.converted} converted</span>
                      <span className="font-bold text-indigo-600">{r.conversion_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Forecast Report ── */}
      {!loading && tab === "forecast" && forecast && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Open Deals" value={forecast.summary.open_deals} />
            <KPI label="Total Pipeline" value={`$${forecast.summary.total_pipeline.toLocaleString()}`} />
            <KPI label="Weighted Forecast" value={`$${forecast.summary.weighted_forecast.toLocaleString()}`} accent="text-indigo-700" />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">Deals in Pipeline</p>
            {forecast.rows.length === 0 ? (
              <p className="text-sm text-gray-400">No open deals</p>
            ) : (
              <div className="space-y-2">
                {forecast.rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs capitalize text-gray-500">{r.stage} · {r.probability}%{r.expected_close_date ? ` · Close ${r.expected_close_date}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">${r.value.toLocaleString()}</p>
                      <p className="text-xs text-indigo-600">Wtd: ${r.weighted_value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Activity Report ── */}
      {!loading && tab === "activity" && activity && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Total Activities" value={activity.summary.total_activities} />
            <KPI label="Completed" value={activity.summary.completed} accent="text-green-700" />
            <KPI label="Pending" value={activity.summary.pending} accent="text-amber-700" />
            <KPI label="Completion Rate" value={`${activity.summary.completion_rate}%`} accent="text-indigo-700" />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">By Activity Type</p>
            {activity.rows.length === 0 ? (
              <p className="text-sm text-gray-400">No activity data</p>
            ) : (
              <div className="space-y-2">
                {activity.rows.map((r) => (
                  <div key={r.type} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm font-medium capitalize text-gray-700">{r.type}</span>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{r.total} total</span>
                      <span className="text-green-600">{r.completed} done</span>
                      <span className="text-amber-600">{r.pending} pending</span>
                      <span className="font-bold text-indigo-600">{r.completion_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-center">
      <p className={`text-xl font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}
