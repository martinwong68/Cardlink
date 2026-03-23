"use client";

import { useEffect, useState } from "react";

import { accountingGet, accountingPost, accountingPatch } from "@/src/lib/accounting/client";
import type { FiscalYearRow, FiscalPeriodRow } from "@/src/lib/accounting/types";

type FiscalYearWithPeriods = FiscalYearRow & { periods: FiscalPeriodRow[] };

export default function AccountingPeriodsPage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYearWithPeriods[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* New fiscal year form */
  const [yearName, setYearName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ fiscal_years: FiscalYearWithPeriods[] }>("/api/accounting/fiscal-periods");
      setFiscalYears(response.fiscal_years ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load fiscal periods.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createYear = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await accountingPost("/api/accounting/fiscal-periods", {
        name: yearName,
        start_date: startDate,
        end_date: endDate,
      });
      setShowForm(false);
      setYearName("");
      setStartDate("");
      setEndDate("");
      await loadData();
      setMessage("Fiscal year created with monthly periods.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create fiscal year.");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePeriodStatus = async (periodId: string, status: "open" | "closed" | "locked") => {
    setMessage(null);
    try {
      await accountingPatch("/api/accounting/fiscal-periods", {
        period_id: periodId,
        status,
      });
      await loadData();
      setMessage(`Period status updated to ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update period status.");
    }
  };

  const statusColor = (status: string) => {
    if (status === "open") return "text-green-600 bg-green-50";
    if (status === "closed") return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-4 pb-28">
      {message ? <p className="app-success px-3 py-2 text-sm">{message}</p> : null}

      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Fiscal Years & Periods</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn px-3 py-1.5 text-xs font-semibold">
              {showForm ? "Cancel" : "+ New Fiscal Year"}
            </button>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        {showForm ? (
          <form onSubmit={(e) => void createYear(e)} className="mb-4 space-y-3 rounded-lg border border-gray-100 p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Fiscal Year Name *</label>
                <input type="text" required value={yearName} onChange={(e) => setYearName(e.target.value)} className="app-input mt-1 w-full" placeholder="FY 2026" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Start Date *</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">End Date *</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="app-input mt-1 w-full" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Monthly periods will be auto-generated within the date range.</p>
            <button type="submit" disabled={isSaving} className="app-primary-btn px-4 py-2 text-xs font-semibold">
              {isSaving ? "Creating..." : "Create Fiscal Year"}
            </button>
          </form>
        ) : null}

        {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : null}

        {!isLoading ? (
          <div className="space-y-4">
            {fiscalYears.map((year) => (
              <div key={year.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{year.name}</p>
                    <p className="text-xs text-gray-500">{year.start_date} → {year.end_date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${statusColor(year.status)}`}>
                    {year.status}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(year.periods ?? []).map((period) => (
                    <div key={period.id} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{period.name}</p>
                        <p className="text-[10px] text-gray-400">{period.start_date} → {period.end_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${statusColor(period.status)}`}>
                          {period.status}
                        </span>
                        <select
                          value={period.status}
                          onChange={(e) => void updatePeriodStatus(period.id, e.target.value as "open" | "closed" | "locked")}
                          className="app-input px-2 py-0.5 text-[10px]"
                          aria-label={`Change status for ${period.name}`}
                        >
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                          <option value="locked">Locked</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {(year.periods ?? []).length === 0 ? (
                    <p className="px-4 py-2 text-xs text-gray-400">No periods generated.</p>
                  ) : null}
                </div>
              </div>
            ))}
            {fiscalYears.length === 0 ? (
              <p className="text-sm text-gray-500">No fiscal years defined yet. Create one to manage accounting periods.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
