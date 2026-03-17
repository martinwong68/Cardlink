"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Building2, FileText, Package, CheckCircle, FileSignature, Truck, ClipboardCheck } from "lucide-react";

type PO = { id: string; po_number: string; status: string; total: number };

export default function BusinessProcurementPage() {
  const [activeVendors, setActiveVendors] = useState(0);
  const [pendingPRs, setPendingPRs] = useState(0);
  const [activePOs, setActivePOs] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [recentPOs, setRecentPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [vendorRes, prRes, poRes, contractRes] = await Promise.all([
        fetch("/api/procurement/vendors", { headers, cache: "no-store" }),
        fetch("/api/procurement/requests", { headers, cache: "no-store" }),
        fetch("/api/procurement/purchase-orders", { headers, cache: "no-store" }),
        fetch("/api/procurement/contracts", { headers, cache: "no-store" }),
      ]);
      if (vendorRes.ok) { const d = await vendorRes.json(); setActiveVendors((d.vendors ?? []).filter((v: any) => v.status === "active").length); }
      if (prRes.ok) { const d = await prRes.json(); setPendingPRs((d.requests ?? []).filter((r: any) => r.status === "submitted").length); }
      if (poRes.ok) { const d = await poRes.json(); const pos = d.purchase_orders ?? []; setActivePOs(pos.filter((o: any) => o.status === "ordered" || o.status === "shipped").length); setRecentPOs(pos.slice(0, 5)); }
      if (contractRes.ok) { const d = await contractRes.json(); setActiveContracts((d.contracts ?? []).filter((c: any) => c.status === "active").length); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: "Active Vendors", value: activeVendors, Icon: Building2, iconBg: "bg-primary-50", iconColor: "text-primary-600" },
    { label: "Pending PRs", value: pendingPRs, Icon: FileText, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Active POs", value: activePOs, Icon: Package, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
    { label: "Active Contracts", value: activeContracts, Icon: FileSignature, iconBg: "bg-primary-50", iconColor: "text-primary-600" },
  ];

  const navItems = [
    { label: "Vendors", href: "/business/procurement/vendors", Icon: Truck },
    { label: "Purchase Requests", href: "/business/procurement/requests", Icon: ClipboardCheck },
    { label: "Purchase Orders", href: "/business/procurement/orders", Icon: Package },
    { label: "Goods Receipt", href: "/business/procurement/goods-receipt", Icon: CheckCircle },
    { label: "Contracts", href: "/business/procurement/contracts", Icon: FileSignature },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading procurement data…</p></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">Procurement</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((m) => (
          <div key={m.label} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
              <m.Icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{m.value}</p>
            <p className="text-[10px] text-neutral-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Modules</h2>
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:border-primary-100 hover:bg-primary-50/30">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <item.Icon className="h-4 w-4 text-primary-600" />
              </span>
              <span className="text-sm font-medium text-neutral-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent POs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recent Purchase Orders</h2>
        {recentPOs.length > 0 ? (
          <div className="space-y-2">
            {recentPOs.map((po) => (
              <div key={po.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{po.po_number}</p>
                  <p className="text-xs text-neutral-500">{po.status}</p>
                </div>
                <p className="text-sm font-bold text-neutral-900">${Number(po.total ?? 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-neutral-400">No purchase orders yet.</p>}
      </div>
    </div>
  );
}
