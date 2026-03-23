"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, ShoppingCart, CreditCard, Banknote, Loader2, Gift, TrendingDown } from "lucide-react";

type Summary = {
  date: string;
  total_sales: number;
  total_refunds: number;
  net_sales: number;
  total_orders: number;
  cash_total: number;
  card_total: number;
  other_total: number;
  points_issued: number;
  points_redeemed: number;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

function fmt(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DailySummaryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/daily-summary?date=${date}`, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setSummary(data.summary ?? null); }
      else { setSummary(null); }
    } catch { setSummary(null); } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Daily Summary</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : !summary ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No data for {date}</p>
          <p className="text-xs text-gray-400">Select another date or check back later.</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><DollarSign className="h-4 w-4 text-emerald-500" />Total Sales</div>
              <p className="mt-1 text-xl font-bold text-gray-900">${fmt(summary.total_sales)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><TrendingDown className="h-4 w-4 text-rose-500" />Total Refunds</div>
              <p className="mt-1 text-xl font-bold text-gray-900">${fmt(summary.total_refunds)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><DollarSign className="h-4 w-4 text-indigo-500" />Net Sales</div>
              <p className="mt-1 text-xl font-bold text-gray-900">${fmt(summary.net_sales)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><ShoppingCart className="h-4 w-4 text-amber-500" />Total Orders</div>
              <p className="mt-1 text-xl font-bold text-gray-900">{summary.total_orders}</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Payment Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600"><Banknote className="h-4 w-4 text-emerald-500" />Cash</span>
                <span className="text-sm font-semibold text-gray-800">${fmt(summary.cash_total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600"><CreditCard className="h-4 w-4 text-indigo-500" />Card</span>
                <span className="text-sm font-semibold text-gray-800">${fmt(summary.card_total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600"><DollarSign className="h-4 w-4 text-gray-400" />Other</span>
                <span className="text-sm font-semibold text-gray-800">${fmt(summary.other_total)}</span>
              </div>
            </div>
          </div>

          {/* Loyalty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Gift className="h-4 w-4 text-indigo-500" />Points Issued</div>
              <p className="mt-1 text-xl font-bold text-gray-900">{summary.points_issued.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Gift className="h-4 w-4 text-teal-500" />Points Redeemed</div>
              <p className="mt-1 text-xl font-bold text-gray-900">{summary.points_redeemed.toLocaleString()}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
