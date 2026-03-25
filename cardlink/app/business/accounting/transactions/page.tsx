"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { accountingGet } from "@/src/lib/accounting/client";
import type { TransactionRow } from "@/src/lib/accounting/types";

export default function AccountingTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <section className="app-card p-4 md:p-5 pb-28">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Journal Entries</h2>
        <div className="flex gap-2">
          <Link href="/business/accounting/transactions/new" className="app-primary-btn px-3 py-1.5 text-xs font-semibold">
            + New Entry
          </Link>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Loading transactions...</p> : null}
      {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-gray-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">Lines</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit ?? 0), 0);
                const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit ?? 0), 0);
                return (
                  <>
                    <tr key={entry.id} className="border-t border-gray-100 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                      <td className="px-2 py-2">{entry.date}</td>
                      <td className="px-2 py-2 font-mono text-xs text-gray-500">{entry.reference_number ?? "-"}</td>
                      <td className="px-2 py-2 font-semibold text-gray-700">{entry.description ?? "Untitled entry"}</td>
                      <td className="px-2 py-2">{entry.lines.length}</td>
                      <td className="px-2 py-2"><span className="app-pill px-2 py-0.5 text-[11px] uppercase">{entry.status}</span></td>
                      <td className="px-2 py-2 text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.id}-detail`}>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div><span className="text-gray-400">Date:</span> <span className="font-medium">{entry.date}</span></div>
                              <div><span className="text-gray-400">Reference:</span> <span className="font-medium font-mono">{entry.reference_number ?? "-"}</span></div>
                              <div><span className="text-gray-400">Status:</span> <span className="font-medium uppercase">{entry.status}</span></div>
                            </div>
                            {entry.description && (
                              <p className="text-xs text-gray-600"><span className="text-gray-400">Description:</span> {entry.description}</p>
                            )}
                            <table className="w-full text-xs mt-2">
                              <thead>
                                <tr className="text-left text-gray-400 border-b border-gray-200">
                                  <th className="pb-1 pr-2">Account</th>
                                  <th className="pb-1 pr-2 text-right">Debit</th>
                                  <th className="pb-1 pr-2 text-right">Credit</th>
                                  <th className="pb-1">Currency</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.lines.map((line) => (
                                  <tr key={line.id} className="border-b border-gray-100">
                                    <td className="py-1.5 pr-2 font-mono text-gray-600">{line.account_id.slice(0, 8)}…</td>
                                    <td className="py-1.5 pr-2 text-right font-medium">{Number(line.debit) > 0 ? `$${Number(line.debit).toFixed(2)}` : "-"}</td>
                                    <td className="py-1.5 pr-2 text-right font-medium">{Number(line.credit) > 0 ? `$${Number(line.credit).toFixed(2)}` : "-"}</td>
                                    <td className="py-1.5 text-gray-400">{line.currency}</td>
                                  </tr>
                                ))}
                                <tr className="font-semibold border-t border-gray-200">
                                  <td className="py-1.5 pr-2 text-gray-700">Total</td>
                                  <td className="py-1.5 pr-2 text-right">${totalDebit.toFixed(2)}</td>
                                  <td className="py-1.5 pr-2 text-right">${totalCredit.toFixed(2)}</td>
                                  <td></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 ? <p className="mt-3 text-sm text-gray-500">No transactions found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
