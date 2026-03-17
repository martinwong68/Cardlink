"use client";

import { useEffect, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { TransactionRow } from "@/src/lib/accounting/types";

export default function AccountingTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<{ transactions: TransactionRow[] }>("/api/accounting/transactions");
      setTransactions(response.transactions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section className="app-card p-4 md:p-5 pb-28 md:pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Journal Entries</h2>
        <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      {isLoading ? <p className="text-sm text-neutral-500">Loading transactions...</p> : null}
      {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-neutral-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">Lines</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((entry) => (
                <tr key={entry.id} className="border-t border-neutral-100">
                  <td className="px-2 py-2">{entry.date}</td>
                  <td className="px-2 py-2 font-mono text-xs text-neutral-500">{entry.reference_number ?? "-"}</td>
                  <td className="px-2 py-2 font-semibold text-neutral-700">{entry.description ?? "Untitled entry"}</td>
                  <td className="px-2 py-2">{entry.lines.length}</td>
                  <td className="px-2 py-2"><span className="app-pill px-2 py-0.5 text-[11px] uppercase">{entry.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No transactions found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
