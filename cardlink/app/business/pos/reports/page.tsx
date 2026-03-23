"use client";

import { useEffect, useState, useCallback } from "react";

type DailyRow = {
  report_date: string;
  total_orders: number;
  total_sales: number;
  total_tax: number;
  total_discounts: number;
  total_refunds: number;
  net_sales: number;
  cash_sales: number;
  card_sales: number;
  wallet_sales: number;
};

type SummaryData = {
  summary?: DailyRow;
  rows?: DailyRow[];
  orders?: Array<{ id: string; total: number; tax: number; payment_method: string; status: string; created_at: string }>;
};

export default function PosReportsPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/reports/daily-summary?start=${startDate}&end=${endDate}`, { headers, cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleExportCsv = () => {
    window.open(`/api/pos/reports/daily-summary?start=${startDate}&end=${endDate}&format=csv`, "_blank");
  };

  // Compute aggregate summary from rows or use single summary
  const summary: DailyRow | null = (() => {
    if (data?.summary) return data.summary as DailyRow;
    if (data?.rows?.length) {
      return data.rows.reduce<DailyRow>((acc, r) => ({
        report_date: `${startDate} to ${endDate}`,
        total_orders: acc.total_orders + Number(r.total_orders),
        total_sales: acc.total_sales + Number(r.total_sales),
        total_tax: acc.total_tax + Number(r.total_tax),
        total_discounts: acc.total_discounts + Number(r.total_discounts),
        total_refunds: acc.total_refunds + Number(r.total_refunds),
        net_sales: acc.net_sales + Number(r.net_sales),
        cash_sales: acc.cash_sales + Number(r.cash_sales),
        card_sales: acc.card_sales + Number(r.card_sales),
        wallet_sales: acc.wallet_sales + Number(r.wallet_sales),
      }), { report_date: "", total_orders: 0, total_sales: 0, total_tax: 0, total_discounts: 0, total_refunds: 0, net_sales: 0, cash_sales: 0, card_sales: 0, wallet_sales: 0 });
    }
    return null;
  })();

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading report…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sales Report</h1>
        <button onClick={handleExportCsv} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
          Export CSV
        </button>
      </div>

      {/* Date range */}
      <div className="flex gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">From</label>
          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">To</label>
          <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs" />
        </div>
      </div>

      {/* Summary cards */}
      {summary ? (
        <div className="space-y-3">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiCard label="Total Orders" value={String(summary.total_orders)} />
            <KpiCard label="Gross Sales" value={`$${Number(summary.total_sales).toFixed(2)}`} />
            <KpiCard label="Net Sales" value={`$${Number(summary.net_sales).toFixed(2)}`} color="text-emerald-700" />
            <KpiCard label="Refunds" value={`$${Number(summary.total_refunds).toFixed(2)}`} color="text-rose-600" />
          </div>

          {/* Breakdown */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900">Breakdown</h3>
            <Row label="Gross Sales" value={summary.total_sales} />
            <Row label="Discounts" value={-summary.total_discounts} color="text-emerald-600" />
            <Row label="Tax Collected" value={summary.total_tax} />
            <Row label="Refunds" value={-summary.total_refunds} color="text-rose-600" />
            <div className="border-t border-gray-100 pt-2">
              <Row label="Net Sales" value={summary.net_sales} bold />
            </div>
          </div>

          {/* Payment method split */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900">By Payment Method</h3>
            <Row label="💵 Cash" value={summary.cash_sales} />
            <Row label="💳 Card" value={summary.card_sales} />
            <Row label="📱 Wallet" value={summary.wallet_sales} />
          </div>

          {/* Daily breakdown if multi-day */}
          {data?.rows && data.rows.length > 1 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
              <h3 className="text-sm font-bold text-gray-900">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="py-1 pr-3">Date</th>
                      <th className="py-1 pr-3">Orders</th>
                      <th className="py-1 pr-3">Sales</th>
                      <th className="py-1 pr-3">Tax</th>
                      <th className="py-1 pr-3">Discounts</th>
                      <th className="py-1 pr-3">Refunds</th>
                      <th className="py-1">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.report_date} className="border-b border-gray-50">
                        <td className="py-1 pr-3 font-medium text-gray-900">{r.report_date}</td>
                        <td className="py-1 pr-3">{r.total_orders}</td>
                        <td className="py-1 pr-3">${Number(r.total_sales).toFixed(2)}</td>
                        <td className="py-1 pr-3">${Number(r.total_tax).toFixed(2)}</td>
                        <td className="py-1 pr-3">${Number(r.total_discounts).toFixed(2)}</td>
                        <td className="py-1 pr-3 text-rose-600">${Number(r.total_refunds).toFixed(2)}</td>
                        <td className="py-1 font-semibold text-gray-900">${Number(r.net_sales).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No sales data for the selected period</p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
      <p className={`text-lg font-bold ${color ?? "text-gray-900"}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  const num = Number(value);
  return (
    <div className="flex justify-between">
      <span className={`text-xs ${color ?? "text-gray-500"}`}>{label}</span>
      <span className={`text-xs ${bold ? "font-bold text-gray-900" : color ?? "text-gray-900"}`}>
        {num < 0 ? `−$${Math.abs(num).toFixed(2)}` : `$${num.toFixed(2)}`}
      </span>
    </div>
  );
}
