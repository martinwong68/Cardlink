"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Puzzle, ClipboardList, ShieldCheck, Key, CreditCard } from "lucide-react";

type AuditEntry = { id: string; action: string; entity_type: string | null; ip_address: string | null; created_at: string };

export default function OwnerDashboardPage() {
  const [enabledModules, setEnabledModules] = useState(0);
  const [totalModules, setTotalModules] = useState(0);
  const [activeKeys, setActiveKeys] = useState(0);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [modRes, keyRes, auditRes] = await Promise.all([
        fetch("/api/owner/modules", { headers, cache: "no-store" }),
        fetch("/api/owner/api-keys", { headers, cache: "no-store" }),
        fetch("/api/owner/audit", { headers, cache: "no-store" }),
      ]);
      if (modRes.ok) { const d = await modRes.json(); const mods = d.modules ?? []; setTotalModules(mods.length); setEnabledModules(mods.filter((m: any) => m.is_enabled).length); }
      if (keyRes.ok) { const d = await keyRes.json(); setActiveKeys((d.api_keys ?? []).filter((k: any) => k.is_active).length); }
      if (auditRes.ok) { const d = await auditRes.json(); setAuditEntries((d.entries ?? []).slice(0, 8)); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: "Active Modules", value: `${enabledModules}/${totalModules}`, Icon: Puzzle, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
    { label: "API Keys", value: activeKeys, Icon: Key, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Audit Events", value: auditEntries.length, Icon: ClipboardList, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  const navItems = [
    { label: "Users & Roles", href: "/business/owner/users", Icon: Users, desc: "Manage team members and permissions" },
    { label: "Modules", href: "/business/owner/modules", Icon: Puzzle, desc: "Enable/disable platform modules" },
    { label: "Audit Log", href: "/business/owner/audit", Icon: ClipboardList, desc: "View all system activity" },
    { label: "Security", href: "/business/owner/security", Icon: ShieldCheck, desc: "Password policy, 2FA, sessions" },
    { label: "API Keys", href: "/business/owner/api-keys", Icon: Key, desc: "Manage API access tokens" },
    { label: "Billing", href: "/business/owner/billing", Icon: CreditCard, desc: "Subscription and usage" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading admin data…</p></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Owner Admin</h1>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((m) => (
          <div key={m.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
              <m.Icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
            <p className="text-[10px] text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:bg-indigo-50/30">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <item.Icon className="h-4 w-4 text-indigo-600" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Audit */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</h2>
        <div className="space-y-2">
          {auditEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-xs font-medium text-gray-900">{e.action}</p>
                <p className="text-[10px] text-gray-500">{e.entity_type ?? ""} · {e.ip_address ?? "—"}</p>
              </div>
              <p className="text-[10px] text-gray-500">{new Date(e.created_at).toLocaleString()}</p>
            </div>
          ))}
          {auditEntries.length === 0 && <p className="text-xs text-gray-400">No recent activity.</p>}
        </div>
      </div>
    </div>
  );
}
