"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, ClipboardCheck, Package, CheckCircle, FileSignature } from "lucide-react";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const procurementFunctions: ModuleFunctionDefinition[] = [
  {
    id: "vendors",
    title: "Vendors",
    description: "Manage your supplier list and contacts",
    icon: Truck,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Vendors",
    ctaHref: "/business/procurement/vendors",
  },
  {
    id: "requests",
    title: "Purchase Requests",
    description: "Submit and track internal purchase requests",
    icon: ClipboardCheck,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "View Requests",
    ctaHref: "/business/procurement/requests",
  },
  {
    id: "orders",
    title: "Purchase Orders",
    description: "Create and manage purchase orders",
    icon: Package,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "View Orders",
    ctaHref: "/business/procurement/orders",
  },
  {
    id: "goods-receipt",
    title: "Goods Receipt",
    description: "Record received goods against purchase orders",
    icon: CheckCircle,
    color: "bg-green-50 text-green-600",
    ctaLabel: "View Receipts",
    ctaHref: "/business/procurement/goods-receipt",
  },
  {
    id: "contracts",
    title: "Contracts",
    description: "Track vendor contracts and renewals",
    icon: FileSignature,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Contracts",
    ctaHref: "/business/procurement/contracts",
  },
];

type Vendor = { id: string; name: string; status: string };
type PR = { id: string; status: string };
type PO = { id: string; po_number: string; status: string; total: number };
type Contract = { id: string; status: string };
type ProcData = { vendors: Vendor[]; requests: PR[]; purchaseOrders: PO[]; contracts: Contract[] };
const HEADERS = { "x-cardlink-app-scope": "business" };

export default function BusinessProcurementPage() {
  const [activeId, setActiveId] = useState<string>(procurementFunctions[0].id);
  const [data, setData] = useState<ProcData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [vRes, rRes, poRes, cRes] = await Promise.all([
          fetch("/api/procurement/vendors", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/procurement/requests", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/procurement/purchase-orders", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/procurement/contracts", { headers: HEADERS, cache: "no-store" }),
        ]);
        const [vd, rd, pod, cd] = await Promise.all([
          vRes.ok ? vRes.json() : {},
          rRes.ok ? rRes.json() : {},
          poRes.ok ? poRes.json() : {},
          cRes.ok ? cRes.json() : {},
        ]);
        setData({
          vendors: vd.vendors ?? [],
          requests: rd.requests ?? [],
          purchaseOrders: pod.purchase_orders ?? [],
          contracts: cd.contracts ?? [],
        });
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const activeFunc = useMemo(
    () => procurementFunctions.find((f) => f.id === activeId) ?? procurementFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return procurementFunctions;
    return procurementFunctions.map((fn) => {
      if (fn.id === "requests") {
        const pending = data.requests.filter((r) => r.status === "submitted").length;
        return pending > 0 ? { ...fn, badgeText: `${pending} pending` } : fn;
      }
      if (fn.id === "orders") {
        const active = data.purchaseOrders.filter((o) => o.status === "ordered" || o.status === "shipped").length;
        return active > 0 ? { ...fn, badgeText: `${active} active` } : fn;
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

function hasContent(id: string, data: ProcData | null): boolean {
  if (!data) return false;
  switch (id) {
    case "vendors": return data.vendors.length > 0;
    case "requests": return data.requests.length > 0;
    case "orders": return data.purchaseOrders.length > 0;
    case "contracts": return data.contracts.length > 0;
    default: return false;
  }
}

function DetailContent({ activeId, data }: { activeId: string; data: ProcData | null }) {
  if (!data) return null;

  switch (activeId) {
    case "vendors": {
      const active = data.vendors.filter((v) => v.status === "active").length;
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{data.vendors.length}</p>
            <p className="text-[10px] text-gray-500">Total Vendors</p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-indigo-700">{active}</p>
            <p className="text-[10px] text-indigo-600">Active</p>
          </div>
        </div>
      );
    }
    case "requests": {
      const submitted = data.requests.filter((r) => r.status === "submitted").length;
      const approved = data.requests.filter((r) => r.status === "approved").length;
      return (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{data.requests.length}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-700">{submitted}</p>
            <p className="text-[10px] text-amber-600">Pending</p>
          </div>
          <div className="rounded-xl bg-green-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-700">{approved}</p>
            <p className="text-[10px] text-green-600">Approved</p>
          </div>
        </div>
      );
    }
    case "orders": {
      const recent = data.purchaseOrders.slice(0, 5);
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent POs</p>
          {recent.map((po) => (
            <div key={po.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{po.po_number}</p>
                <span className={`text-[10px] font-medium ${po.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>{po.status}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">${Number(po.total ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      );
    }
    case "goods-receipt":
      return <p className="text-sm text-gray-500">Record and verify received goods against your purchase orders.</p>;
    case "contracts": {
      const active = data.contracts.filter((c) => c.status === "active").length;
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{data.contracts.length}</p>
            <p className="text-[10px] text-gray-500">Total Contracts</p>
          </div>
          <div className="rounded-xl bg-purple-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-purple-700">{active}</p>
            <p className="text-[10px] text-purple-600">Active</p>
          </div>
        </div>
      );
    }
    default: return null;
  }
}
