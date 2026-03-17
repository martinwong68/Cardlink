"use client";

import { useMemo, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";

const reportTypes = ["profit-loss", "balance-sheet", "cash-flow", "trial-balance"];

type ReportResponse = {
  contract?: string;
  [key: string]: unknown;
};

export default function AccountingReportsPage() {
  const [reportType, setReportType] = useState("profit-loss");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportQuery = useMemo(
    () => `/api/accounting/reports?type=${encodeURIComponent(reportType)}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    [reportType, startDate, endDate]
  );

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<ReportResponse>(reportQuery);
      setReport(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      <section className="app-card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-neutral-800">Report Builder</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select value={reportType} onChange={(event) => setReportType(event.target.value)} className="app-input px-3 py-2 text-sm">
            {reportTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="app-input px-3 py-2 text-sm" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="app-input px-3 py-2 text-sm" />
          <button type="button" onClick={() => void loadReport()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Generate</button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-neutral-500">Generating report...</p> : null}
      {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

      {report ? (
        <section className="app-card p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{report.contract ?? "accounting.reports.v1"}</p>
          <pre className="mt-3 overflow-auto rounded-xl bg-gray-950 p-3 text-xs text-neutral-100">{JSON.stringify(report, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
