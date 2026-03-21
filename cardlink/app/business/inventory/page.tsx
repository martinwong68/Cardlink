"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, ArrowRightLeft, BarChart3, FileText } from "lucide-react";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const inventoryFunctions: ModuleFunctionDefinition[] = [
  {
    id: "products",
    title: "Products",
    description: "Manage your inventory product catalogue",
    icon: Package,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Products",
    ctaHref: "/business/inventory/products",
  },
  {
    id: "movements",
    title: "Stock Movements",
    description: "Record stock in, out, and adjustments",
    icon: ArrowRightLeft,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "View Movements",
    ctaHref: "/business/inventory/movements",
  },
  {
    id: "balances",
    title: "Balances",
    description: "View live on-hand quantities per product",
    icon: BarChart3,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "View Balances",
    ctaHref: "/business/inventory/balances",
  },
  {
    id: "rfq",
    title: "Purchase Requests",
    description: "Create and manage purchase requests (RFQ)",
    icon: FileText,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "View Requests",
    ctaHref: "/business/procurement/requests",
  },
];

type ProductRow = { id: string; sku: string; name: string; unit: string; is_active: boolean };
type BalanceRow = { product_id: string; on_hand: number; updated_at: string };
type InvData = { products: ProductRow[]; balances: BalanceRow[] };
const HEADERS = { "x-cardlink-app-scope": "business" };

export default function BusinessInventoryPage() {
  const [activeId, setActiveId] = useState<string>(inventoryFunctions[0].id);
  const [data, setData] = useState<InvData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [prodRes, balRes] = await Promise.all([
          fetch("/api/inventory/products", { headers: HEADERS, cache: "no-store" }),
          fetch("/api/inventory/balances", { headers: HEADERS, cache: "no-store" }),
        ]);
        const [pd, bd] = await Promise.all([
          prodRes.ok ? prodRes.json() : ({} as Record<string, unknown>),
          balRes.ok ? balRes.json() : ({} as Record<string, unknown>),
        ]);
        setData({ products: pd.products ?? [], balances: bd.balances ?? [] });
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const activeFunc = useMemo(
    () => inventoryFunctions.find((f) => f.id === activeId) ?? inventoryFunctions[0],
    [activeId],
  );

  const functionsWithBadges = useMemo(() => {
    if (!data) return inventoryFunctions;
    return inventoryFunctions.map((fn) => {
      if (fn.id === "products") {
        const inactive = data.products.filter((p) => !p.is_active).length;
        return inactive > 0 ? { ...fn, badgeText: `${inactive} inactive` } : fn;
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

function hasContent(id: string, data: InvData | null): boolean {
  if (!data) return false;
  switch (id) {
    case "products": return data.products.length > 0;
    case "balances": return data.balances.length > 0;
    default: return false;
  }
}

function DetailContent({ activeId, data }: { activeId: string; data: InvData | null }) {
  if (!data) return null;

  switch (activeId) {
    case "products": {
      const active = data.products.filter((p) => p.is_active).length;
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">{data.products.length}</p>
              <p className="text-[10px] text-gray-500">Total</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-gray-900">{active}</p>
              <p className="text-[10px] text-gray-500">Active</p>
            </div>
          </div>
          {data.products.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.sku} · {p.unit}</p>
              </div>
              <span className={`text-[10px] font-medium ${p.is_active ? "text-emerald-500" : "text-gray-400"}`}>
                {p.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "movements":
      return (
        <p className="text-sm text-gray-500">View recent stock-in, stock-out, and adjustment records.</p>
      );
    case "balances": {
      const enriched = data.balances.map((b) => {
        const prod = data.products.find((p) => p.id === b.product_id);
        return { ...b, name: prod?.name ?? b.product_id, unit: prod?.unit ?? "" };
      });
      return (
        <div className="space-y-2">
          {enriched.slice(0, 5).map((b) => (
            <div key={b.product_id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <p className="text-sm font-semibold text-gray-800">{b.name}</p>
              <p className="text-sm font-bold text-gray-900">{b.on_hand} {b.unit}</p>
            </div>
          ))}
          {enriched.length === 0 && <p className="text-sm text-gray-400">No balances recorded yet.</p>}
        </div>
      );
    }
    default: return null;
  }
}
