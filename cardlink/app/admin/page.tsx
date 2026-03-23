"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  CreditCard,
  FileText,
  Activity,
  Shield,
  Settings,
  TrendingUp,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import AdminNav from "./admin-nav";

type PlatformStats = {
  totalUsers: number;
  totalCompanies: number;
  activeSubscriptions: number;
  openReports: number;
  recentAuditCount: number;
  totalCards: number;
  bannedUsers: number;
  newUsersToday: number;
};

type RecentAudit = {
  id: string;
  action: string;
  target_table: string | null;
  created_at: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalCompanies: 0,
    activeSubscriptions: 0,
    openReports: 0,
    recentAuditCount: 0,
    totalCards: 0,
    bannedUsers: 0,
    newUsersToday: 0,
  });
  const [recentAudit, setRecentAudit] = useState<RecentAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "admin" };

  const load = useCallback(async () => {
    try {
      const [statsRes, auditRes] = await Promise.all([
        fetch("/api/admin/stats", { headers, cache: "no-store" }),
        fetch("/api/admin/audit?limit=8", { headers, cache: "no-store" }),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats ?? stats);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setRecentAudit(d.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      Icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Companies",
      value: stats.totalCompanies,
      Icon: Building2,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
    },
    {
      label: "Active Subscriptions",
      value: stats.activeSubscriptions,
      Icon: CreditCard,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Open Reports",
      value: stats.openReports,
      Icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "New Users Today",
      value: stats.newUsersToday,
      Icon: UserCheck,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Banned Users",
      value: stats.bannedUsers,
      Icon: Shield,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ];

  const navItems = [
    {
      label: "Users",
      href: "/admin/users",
      Icon: Users,
      desc: "Manage all platform users",
    },
    {
      label: "Companies",
      href: "/admin/companies",
      Icon: Building2,
      desc: "View and manage all companies",
    },
    {
      label: "Subscriptions",
      href: "/admin/subscriptions",
      Icon: CreditCard,
      desc: "View all subscription plans and statuses",
    },
    {
      label: "Reports",
      href: "/admin/reports",
      Icon: FileText,
      desc: "Moderate user-submitted reports",
    },
    {
      label: "Audit Log",
      href: "/admin/audit",
      Icon: Activity,
      desc: "Platform admin action trail",
    },
    {
      label: "Settings",
      href: "/admin/settings",
      Icon: Settings,
      desc: "Platform configuration",
    },
  ];

  if (loading)
    return (
      <div className="space-y-4">
        <AdminNav />
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-500">Loading admin data…</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <AdminNav />
      <h1 className="text-xl font-bold text-gray-900">Platform Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statCards.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div
              className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}
            >
              <m.Icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
            <p className="text-[10px] text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <div className="grid gap-2 sm:grid-cols-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-100 hover:bg-red-50/30"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <item.Icon className="h-4 w-4 text-red-600" />
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
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Recent Platform Activity
        </h2>
        <div className="space-y-2">
          {recentAudit.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-xs font-medium text-gray-900">{e.action}</p>
                <p className="text-[10px] text-gray-500">
                  {e.target_table ?? ""}
                </p>
              </div>
              <p className="text-[10px] text-gray-500">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {recentAudit.length === 0 && (
            <p className="text-xs text-gray-400">No recent platform activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
