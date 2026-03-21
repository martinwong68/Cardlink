"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, ClipboardList, Package, Clock } from "lucide-react";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const posFunctions: ModuleFunctionDefinition[] = [
  {
    id: "terminal",
    title: "Terminal",
    description: "Open the POS terminal to process sales",
    icon: Monitor,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "Open Terminal",
    ctaHref: "/business/pos/terminal",
  },
  {
    id: "products",
    title: "Products",
    description: "Manage your product catalogue and pricing",
    icon: Package,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "View Products",
    ctaHref: "/business/pos/products",
  },
  {
    id: "orders",
    title: "Orders",
    description: "Review receipts, refunds, and order history",
    icon: ClipboardList,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "View Orders",
    ctaHref: "/business/pos/orders",
  },
  {
    id: "shifts",
    title: "Shifts",
    description: "Open, close, and review register shifts",
    icon: Clock,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Shifts",
    ctaHref: "/business/pos/shifts",
  },
];

type Order = { id: string; receipt_number: string; status: string; total: number; payment_method: string | null; created_at: string };
type Product = { id: string; name: string; stock: number; is_active: boolean };
type Shift = { id: string; status: string };

type PosData = { orders: Order[]; products: Product[]; shifts: Shift[] };
const HEADERS = { "x-cardlink-app-scope": "business" };

export default function PosLandingPage() {
  const [activeId, setActiveId] = useState<string>(posFunctions[0].id);
  const [data, setData] = useState<PosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ordRes, prodRes, shiftRes] = await Promise.all([
          fetch("/api/pos/orders", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/pos/products", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/pos/shifts", { headers: HEADERS, cache: "no-store" }),
        ]);
        const [od, pd, sd] = await Promise.all([
          ordRes.ok ? ordRes.json() : {},
          prodRes.ok ? prodRes.json() : {},
          shiftRes.ok ? shiftRes.json() : {},
        ]);
        setData({ orders: od.orders ?? [], products: pd.products ?? [], shifts: sd.shifts ?? [] });
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const activeFunc = useMemo(
    () => posFunctions.find((f) => f.id === activeId) ?? posFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return posFunctions;
    return posFunctions.map((fn) => {
      if (fn.id === "shifts") {
        const open = data.shifts.filter((s) => s.status === "open").length;
        return open > 0 ? { ...fn, badgeText: `${open} open` } : fn;
      }
      if (fn.id === "products") {
        const low = data.products.filter((p) => p.stock < 10 && p.is_active).length;
        return low > 0 ? { ...fn, badgeText: `${low} low stock` } : fn;
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

function hasContent(id: string, data: PosData | null): boolean {
  if (!data) return false;
  switch (id) {
    case "orders": return data.orders.length > 0;
    case "products": return data.products.length > 0;
    case "shifts": return data.shifts.length > 0;
    default: return false;
  }
}

function DetailContent({ activeId, data }: { activeId: string; data: PosData | null }) {
  if (!data) return null;

  switch (activeId) {
    case "terminal": {
      const today = new Date().toDateString();
      const todayOrders = data.orders.filter((o) => new Date(o.created_at).toDateString() === today);
      const todaySales = todayOrders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">${todaySales.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500">Today&apos;s Sales</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{todayOrders.length}</p>
            <p className="text-[10px] text-gray-500">Today&apos;s Orders</p>
          </div>
        </div>
      );
    }
    case "orders": {
      const recent = data.orders.slice(0, 5);
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent orders</p>
          {recent.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{o.receipt_number}</p>
                <p className="text-xs text-gray-500">{o.payment_method ?? "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">${Number(o.total).toLocaleString()}</p>
                <span className={`text-[10px] font-medium ${o.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "products": {
      const active = data.products.filter((p) => p.is_active).length;
      const low = data.products.filter((p) => p.stock < 10 && p.is_active).length;
      return (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{data.products.length}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{active}</p>
            <p className="text-[10px] text-gray-500">Active</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-700">{low}</p>
            <p className="text-[10px] text-amber-600">Low Stock</p>
          </div>
        </div>
      );
    }
    case "shifts": {
      const open = data.shifts.filter((s) => s.status === "open").length;
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{data.shifts.length}</p>
            <p className="text-[10px] text-gray-500">Total Shifts</p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-indigo-700">{open}</p>
            <p className="text-[10px] text-indigo-600">Open Now</p>
          </div>
        </div>
      );
    }
    default: return null;
  }
}
