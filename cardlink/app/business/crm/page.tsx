"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Handshake, TrendingUp, Megaphone, Filter, Plus } from "lucide-react";

type Metrics = {
  hotLeads: number;
  openDeals: number;
  pipeline: number;
  activeCampaigns: number;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  created_at: string;
};

type Deal = {
  id: string;
  title: string;
  stage: string;
  value: number;
};

const STAGE_CONFIG: Record<string, { color: string; label: string }> = {
  qualification: { color: "#14B8A6", label: "Qualified" },
  proposal: { color: "#6366F1", label: "Proposal" },
  negotiation: { color: "#F59E0B", label: "Negotiation" },
  closing: { color: "#8B5CF6", label: "Closing" },
  won: { color: "#10B981", label: "Won" },
  lost: { color: "#EF4444", label: "Lost" },
};

export default function CrmDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    hotLeads: 0,
    openDeals: 0,
    pipeline: 0,
    activeCampaigns: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [leadsRes, dealsRes, activitiesRes, campaignsRes] = await Promise.all([
          fetch("/api/crm/leads", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
          fetch("/api/crm/deals", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
          fetch("/api/crm/activities", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
          fetch("/api/crm/campaigns", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        ]);

        const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [] };
        const dealsData = dealsRes.ok ? await dealsRes.json() : { deals: [] };
        const activitiesData = activitiesRes.ok ? await activitiesRes.json() : { activities: [] };
        const campaignsData = campaignsRes.ok ? await campaignsRes.json() : { campaigns: [] };

        const leadsList = leadsData.leads ?? [];
        const dealsList = dealsData.deals ?? [];
        const actList = activitiesData.activities ?? [];
        const campList = campaignsData.campaigns ?? [];

        const hotLeads = leadsList.filter((l: any) => l.temperature === "hot").length;
        const openDeals = dealsList.filter((d: any) => d.stage !== "won" && d.stage !== "lost").length;
        const pipeline = dealsList
          .filter((d: any) => d.stage !== "won" && d.stage !== "lost")
          .reduce((s: number, d: any) => s + Number(d.value ?? 0), 0);
        const activeCampaigns = campList.filter((c: any) => c.status === "active").length;

        setMetrics({ hotLeads, openDeals, pipeline, activeCampaigns });
        setActivities(actList.slice(0, 5));
        setDeals(dealsList);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading CRM data…</p>
      </div>
    );
  }

  const statCards = [
    { label: "Hot Leads", value: metrics.hotLeads, Icon: Flame, iconBg: "bg-rose-50", iconColor: "text-rose-500" },
    { label: "Open Deals", value: metrics.openDeals, Icon: Handshake, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Pipeline", value: `$${(metrics.pipeline / 1000).toFixed(0)}k`, Icon: TrendingUp, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
    { label: "Campaigns", value: metrics.activeCampaigns, Icon: Megaphone, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  const stages = ["qualification", "proposal", "negotiation", "closing", "won", "lost"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">CRM Pipeline</h2>
          <p className="text-xs text-gray-500">Manage leads, deals, and contacts</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
            <Filter className="h-3 w-3" />Filter
          </button>
          <Link
            href="/business/crm/deals"
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3 w-3" />New Deal
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((m) => (
          <div key={m.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{m.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
                <m.Icon className={`h-4 w-4 ${m.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const cfg = STAGE_CONFIG[stage] ?? { color: "#9CA3AF", label: stage };
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="min-w-[160px] flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {stageDeals.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageDeals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((d) => (
                    <div
                      key={d.id}
                      className="cursor-pointer rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="truncate text-xs font-medium text-gray-800">
                          {d.title}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        ${Number(d.value).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Recent Activities</span>
          <Link href="/business/crm/activities" className="text-xs font-medium text-indigo-600">
            View All
          </Link>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activities.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
              >
                <div>
                  <p className="text-xs font-medium capitalize text-gray-700">{a.type}</p>
                  <p className="text-xs text-gray-500">{a.title}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
