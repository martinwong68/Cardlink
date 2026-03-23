"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  Handshake,
  Users,
  Activity,
  Megaphone,
  BarChart3,
} from "lucide-react";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

/* ── CRM function tile definitions ── */
const crmFunctions: ModuleFunctionDefinition[] = [
  {
    id: "leads",
    title: "Leads",
    description: "Capture and qualify new leads for your pipeline",
    icon: Flame,
    color: "bg-rose-50 text-rose-600",
    ctaLabel: "View Leads",
    ctaHref: "/business/crm/leads",
  },
  {
    id: "deals",
    title: "Deals",
    description: "Track deals through every stage of your pipeline",
    icon: Handshake,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Deals",
    ctaHref: "/business/crm/deals",
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Manage customer and vendor contact records",
    icon: Users,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "View Contacts",
    ctaHref: "/business/crm/contacts",
  },
  {
    id: "activities",
    title: "Activities",
    description: "Log calls, emails, meetings, and follow-ups",
    icon: Activity,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "View Activities",
    ctaHref: "/business/crm/activities",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Plan and run marketing campaigns",
    icon: Megaphone,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Campaigns",
    ctaHref: "/business/crm/campaigns",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Pipeline, conversion, forecast & activity analytics",
    icon: BarChart3,
    color: "bg-sky-50 text-sky-600",
    ctaLabel: "View Reports",
    ctaHref: "/business/crm/reports",
  },
];

type CrmData = {
  leads: Array<{ id: string; temperature?: string }>;
  deals: Array<{ id: string; title: string; stage: string; value: number }>;
  activities: Array<{ id: string; type: string; title: string; created_at: string }>;
  campaigns: Array<{ id: string; name?: string; status?: string }>;
};

const HEADERS = { "x-cardlink-app-scope": "business" };

export default function CrmLandingPage() {
  const [activeId, setActiveId] = useState<string>(crmFunctions[0].id);
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [leadsRes, dealsRes, actRes, campRes] = await Promise.all([
          fetch("/api/crm/leads", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/crm/deals", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/crm/activities", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/crm/campaigns", { headers: HEADERS, cache: "no-store" }),
        ]);
        const [ld, dd, ad, cd] = await Promise.all([
          leadsRes.ok ? leadsRes.json() : ({} as Record<string, unknown>),
          dealsRes.ok ? dealsRes.json() : ({} as Record<string, unknown>),
          actRes.ok ? actRes.json() : ({} as Record<string, unknown>),
          campRes.ok ? campRes.json() : ({} as Record<string, unknown>),
        ]);
        setData({
          leads: ld.leads ?? [],
          deals: dd.deals ?? [],
          activities: ad.activities ?? [],
          campaigns: cd.campaigns ?? [],
        });
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const activeFunc = useMemo(
    () => crmFunctions.find((f) => f.id === activeId) ?? crmFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return crmFunctions;
    return crmFunctions.map((fn) => {
      if (fn.id === "leads") {
        const hot = data.leads.filter((l) => l.temperature === "hot").length;
        return hot > 0 ? { ...fn, badgeText: `${hot} hot` } : fn;
      }
      if (fn.id === "deals") {
        const open = data.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
        return open > 0 ? { ...fn, badgeText: `${open} open` } : fn;
      }
      return fn;
    });
  }, [data]);

  return (
    <div className="space-y-4 pb-28">
      <ModuleFunctionSlider items={functionsWithBadges} activeId={activeId} onSelect={setActiveId} />
      <ModuleFunctionDetailCard
        title={activeFunc.title}
        description={activeFunc.description}
        ctaLabel={activeFunc.ctaLabel}
        ctaHref={activeFunc.ctaHref}
        loading={loading}
        empty={!loading && !hasContent(activeId, data)}
        emptyMessage={`No ${activeFunc.title.toLowerCase()} data yet`}
      >
        <DetailContent activeId={activeId} data={data} />
      </ModuleFunctionDetailCard>
    </div>
  );
}

function hasContent(id: string, data: CrmData | null): boolean {
  if (!data) return false;
  switch (id) {
    case "leads": return data.leads.length > 0;
    case "deals": return data.deals.length > 0;
    case "activities": return data.activities.length > 0;
    case "campaigns": return data.campaigns.length > 0;
    case "reports": return data.deals.length > 0 || data.leads.length > 0;
    default: return false;
  }
}

function DetailContent({ activeId, data }: { activeId: string; data: CrmData | null }) {
  if (!data) return null;

  switch (activeId) {
    case "leads": {
      const temps = ["hot", "warm", "cold"];
      const grouped = temps.map((t) => ({
        label: t, count: data.leads.filter((l) => l.temperature === t).length,
      }));
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            {grouped.map((g) => (
              <div key={g.label} className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">{g.count}</p>
                <p className="text-[10px] text-gray-500 capitalize">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "deals": {
      const recent = data.deals.slice(0, 5);
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent deals</p>
          {recent.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{d.title}</p>
                <p className="text-xs text-gray-500 capitalize">{d.stage}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">${Number(d.value).toLocaleString()}</p>
            </div>
          ))}
        </div>
      );
    }
    case "activities": {
      const recent = data.activities.slice(0, 5);
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent activities</p>
          {recent.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800 capitalize">{a.type}</p>
                <p className="text-xs text-gray-500">{a.title}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      );
    }
    case "campaigns": {
      const active = data.campaigns.filter((c) => c.status === "active").length;
      const total = data.campaigns.length;
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign summary</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">{active}</p>
              <p className="text-[10px] text-gray-500">Active</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">{total}</p>
              <p className="text-[10px] text-gray-500">Total</p>
            </div>
          </div>
        </div>
      );
    }
    case "reports": {
      const openDeals = data.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
      const pipelineValue = data.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + Number(d.value), 0);
      const wonDeals = data.deals.filter((d) => d.stage === "won").length;
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick metrics</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">{openDeals}</p>
              <p className="text-[10px] text-gray-500">Open Deals</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">${pipelineValue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">Pipeline</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-green-700">{wonDeals}</p>
              <p className="text-[10px] text-gray-500">Won</p>
            </div>
          </div>
        </div>
      );
    }
    default: return null;
  }
}
