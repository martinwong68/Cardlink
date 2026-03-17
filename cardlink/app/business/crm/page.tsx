"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Handshake, TrendingUp, Megaphone, Target, DollarSign, User, Phone, Mail } from "lucide-react";

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

const STAGE_COLORS: Record<string, string> = {
  qualification: "bg-blue-500",
  proposal: "bg-indigo-500",
  negotiation: "bg-amber-500",
  closing: "bg-teal-500",
  won: "bg-emerald-500",
  lost: "bg-rose-500",
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

  const stages = ["qualification", "proposal", "negotiation", "closing", "won", "lost"];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">CRM</h1>
        <p className="text-xs text-gray-500">Customer relationship management overview</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((m) => (
          <div key={m.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
              <m.Icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline by Stage */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Pipeline by Stage</h2>
        <div className="space-y-2">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const stageValue = stageDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
            return (
              <div
                key={stage}
                className="flex items-center rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className={`mr-3 h-3 w-3 rounded-full ${STAGE_COLORS[stage] ?? "bg-gray-400"}`} />
                <span className="flex-1 text-sm font-medium capitalize text-gray-700">{stage}</span>
                <span className="mr-3 text-xs text-gray-500">{stageDeals.length} deals</span>
                <span className="text-sm font-semibold text-gray-900">${stageValue.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Nav */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Modules</h2>
        <div className="space-y-2">
          {[
            { label: "Leads", href: "/business/crm/leads", Icon: Target },
            { label: "Deals", href: "/business/crm/deals", Icon: DollarSign },
            { label: "Contacts", href: "/business/crm/contacts", Icon: User },
            { label: "Activities", href: "/business/crm/activities", Icon: Phone },
            { label: "Campaigns", href: "/business/crm/campaigns", Icon: Mail },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:bg-indigo-50/30"
            >
              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <item.Icon className="h-4 w-4 text-indigo-600" />
              </span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Activities</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activities.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium capitalize text-gray-700">{a.type}</p>
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
