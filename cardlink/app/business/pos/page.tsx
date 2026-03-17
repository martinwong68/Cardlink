"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Monitor, ClipboardList, Package, Clock, DollarSign, AlertTriangle, ShoppingBag, BarChart3 } from "lucide-react";

type Order = { id: string; receipt_number: string; status: string; total: number; payment_method: string | null; created_at: string };
type Product = { id: string; name: string; stock: number; is_active: boolean };
type Shift = { id: string; status: string };

export default function BusinessPosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [ordRes, prodRes, shiftRes] = await Promise.all([
        fetch("/api/pos/orders", { headers, cache: "no-store" }),
        fetch("/api/pos/products", { headers, cache: "no-store" }),
        fetch("/api/pos/shifts", { headers, cache: "no-store" }),
      ]);
      if (ordRes.ok) { const d = await ordRes.json(); setOrders(d.orders ?? []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
      if (shiftRes.ok) { const d = await shiftRes.json(); setShifts(d.shifts ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const todaySales = todayOrders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);
  const openShifts = shifts.filter((s) => s.status === "open");
  const lowStock = products.filter((p) => p.stock < 10 && p.is_active);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading POS data…</p></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Point of Sale</h1>
        <p className="text-xs text-neutral-500">POS overview and quick actions</p>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <Link href="/business/pos/terminal" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white hover:bg-primary-700">
          <Monitor className="h-3.5 w-3.5" /> Terminal
        </Link>
        <Link href="/business/pos/orders" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
          <ClipboardList className="h-3.5 w-3.5" /> Orders
        </Link>
        <Link href="/business/pos/products" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
          <Package className="h-3.5 w-3.5" /> Products
        </Link>
        <Link href="/business/pos/shifts" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
          <Clock className="h-3.5 w-3.5" /> Shifts
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
            <DollarSign className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">${todaySales.toLocaleString()}</p>
          <p className="text-xs text-neutral-500">Today&apos;s Sales · {todayOrders.length} orders</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <BarChart3 className="h-4 w-4 text-primary-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">{openShifts.length}</p>
          <p className="text-xs text-neutral-500">Open Shifts</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <ShoppingBag className="h-4 w-4 text-primary-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">{products.length}</p>
          <p className="text-xs text-neutral-500">Total Products</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">{lowStock.length}</p>
          <p className="text-xs text-neutral-500">Low Stock Items</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recent Orders</h2>
        {todayOrders.length > 0 ? (
          <div className="space-y-2">
            {todayOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{o.receipt_number}</p>
                  <p className="text-xs text-neutral-500">{o.payment_method ?? "N/A"} · {new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">${Number(o.total).toLocaleString()}</p>
                  <p className={`text-xs font-medium ${o.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>{o.status.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
            <p className="text-sm font-medium text-neutral-500">No orders today</p>
            <p className="text-xs text-neutral-400">Start a shift and process your first sale.</p>
          </div>
        )}
      </div>
    </div>
  );
}
