"use client";

import { useEffect, useMemo, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { PayrollRow } from "@/src/lib/accounting/types";

function asCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

export default function AccountingPayrollPage() {
  const [records, setRecords] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<{ payroll_records: PayrollRow[] }>("/api/accounting/payroll");
      setRecords(response.payroll_records ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const gross = records.reduce((sum, item) => sum + Number(item.gross_salary ?? 0), 0);
    const deductions = records.reduce((sum, item) => sum + Number(item.deductions ?? 0), 0);
    const net = records.reduce((sum, item) => sum + Number(item.net_salary ?? 0), 0);
    return { count: records.length, gross, deductions, net };
  }, [records]);

  return (
    <div className="space-y-4 pb-28">
      <section className="grid gap-3 md:grid-cols-4">
        <article className="app-card p-4"><p className="text-xs text-gray-500">Employees</p><p className="mt-1 text-2xl font-bold">{summary.count}</p></article>
        <article className="app-card p-4"><p className="text-xs text-gray-500">Gross</p><p className="mt-1 text-2xl font-bold">{asCurrency(summary.gross)}</p></article>
        <article className="app-card p-4"><p className="text-xs text-gray-500">Deductions</p><p className="mt-1 text-2xl font-bold text-rose-600">{asCurrency(summary.deductions)}</p></article>
        <article className="app-card p-4"><p className="text-xs text-gray-500">Net</p><p className="mt-1 text-2xl font-bold text-emerald-600">{asCurrency(summary.net)}</p></article>
      </section>

      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Payroll Records</h2>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
        </div>
        {isLoading ? <p className="text-sm text-gray-500">Loading payroll...</p> : null}
        {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="space-y-2">
            {records.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-800">Employee: {item.employee_id}</p>
                <p className="text-xs text-gray-500">{item.period_start} to {item.period_end}</p>
                <p className="mt-1 text-sm text-gray-700">{asCurrency(item.net_salary)} · {item.status}</p>
              </div>
            ))}
            {records.length === 0 ? <p className="text-sm text-gray-500">No payroll records found.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
