"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type ReportSummary = {
  date_from: string;
  date_to: string;
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  pending: number;
  confirmed: number;
  revenue: number;
  completion_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  service_breakdown: Array<{ name: string; count: number; revenue: number }>;
  daily_breakdown: Array<{ date: string; count: number; revenue: number }>;
};

export default function BookingReportsPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading } = useActiveCompany();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const loadReport = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business/booking/reports?date_from=${dateFrom}&date_to=${dateTo}`);
      const json = await res.json();
      if (json.summary) setSummary(json.summary);
    } catch { /* ignore */ }
    setLoading(false);
  }, [companyId, dateFrom, dateTo]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadReport();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadReport]);

  const handleExportCsv = () => {
    window.open(`/api/business/booking/reports?date_from=${dateFrom}&date_to=${dateTo}&format=csv`, "_blank");
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/booking" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("reports.title")}</h1>
        </div>
        <button
          onClick={handleExportCsv}
          className="app-secondary-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="app-input rounded-lg border px-3 py-2 text-sm flex-1"
        />
        <span className="text-xs text-gray-400">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="app-input rounded-lg border px-3 py-2 text-sm flex-1"
        />
      </div>

      {!summary ? (
        <div className="app-card flex flex-col items-center py-12 text-center">
          <BarChart3 className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t("reports.empty")}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="app-card p-4 text-center">
              <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{summary.total_appointments}</p>
              <p className="text-[10px] text-gray-500">{t("reports.totalAppointments")}</p>
            </div>
            <div className="app-card p-4 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">${summary.revenue.toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">{t("reports.revenue")}</p>
            </div>
            <div className="app-card p-4 text-center">
              <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{summary.completion_rate}%</p>
              <p className="text-[10px] text-gray-500">{t("reports.completionRate")}</p>
            </div>
            <div className="app-card p-4 text-center">
              <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{summary.no_show_rate}%</p>
              <p className="text-[10px] text-gray-500">{t("reports.noShowRate")}</p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="app-card p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">{t("reports.statusBreakdown")}</h3>
            <div className="space-y-2">
              {[
                { label: t("statuses.completed"), value: summary.completed, color: "bg-green-500" },
                { label: t("statuses.confirmed"), value: summary.confirmed, color: "bg-blue-500" },
                { label: t("statuses.pending"), value: summary.pending, color: "bg-amber-500" },
                { label: t("statuses.cancelled"), value: summary.cancelled, color: "bg-gray-400" },
                { label: t("statuses.no_show"), value: summary.no_show, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${item.color}`}
                      style={{ width: `${summary.total_appointments > 0 ? (item.value / summary.total_appointments) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Breakdown */}
          {summary.service_breakdown.length > 0 && (
            <div className="app-card p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">{t("reports.byService")}</h3>
              <div className="space-y-2">
                {summary.service_breakdown.map((svc) => (
                  <div key={svc.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 flex-1 truncate">{svc.name}</span>
                    <span className="text-xs text-gray-500">{svc.count} {t("reports.bookings")}</span>
                    <span className="text-xs font-semibold text-green-600">${svc.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Breakdown */}
          {summary.daily_breakdown.length > 0 && (
            <div className="app-card p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">{t("reports.dailyBreakdown")}</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {summary.daily_breakdown.map((day) => (
                  <div key={day.date} className="flex items-center gap-3 py-1">
                    <span className="text-xs text-gray-500 w-24 font-mono">{day.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, (day.count / Math.max(...summary.daily_breakdown.map((d) => d.count))) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-700 w-8 text-right">{day.count}</span>
                    <span className="text-xs text-green-600 w-16 text-right">${day.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
