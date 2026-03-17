"use client";

import { useEffect, useMemo, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { AccountRow, InvoiceRow, TransactionRow } from "@/src/lib/accounting/types";

type DashboardPayload = {
  accounts: AccountRow[];
  transactions: TransactionRow[];
  invoices: InvoiceRow[];
};

function toAmount(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function AccountingDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accountsRes, transactionsRes, invoicesRes] = await Promise.all([
        accountingGet<{ accounts: AccountRow[] }>("/api/accounting/accounts"),
        accountingGet<{ transactions: TransactionRow[] }>("/api/accounting/transactions"),
        accountingGet<{ invoices: InvoiceRow[] }>("/api/accounting/invoices"),
      ]);

      setPayload({
        accounts: accountsRes.accounts ?? [],
        transactions: transactionsRes.transactions ?? [],
        invoices: invoicesRes.invoices ?? [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load accounting dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => {
    const transactions = payload?.transactions ?? [];
    const invoices = payload?.invoices ?? [];
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0);
    const postedCount = transactions.filter((entry) => entry.status === "posted").length;
    const overdueTotal = invoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0);

    return {
      accountCount: payload?.accounts.length ?? 0,
      postedCount,
      totalInvoiced,
      overdueTotal,
    };
  }, [payload]);

  const recentTransactions = useMemo(
    () => [...(payload?.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [payload]
  );

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Accounts</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.accountCount}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Posted Txns</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.postedCount}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Invoiced</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{toAmount(stats.totalInvoiced)}</p>
        </article>
        <article className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Overdue</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{toAmount(stats.overdueTotal)}</p>
        </article>
      </section>

      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Recent Transactions</h2>
          <button
            type="button"
            onClick={() => void loadData()}
            className="app-secondary-btn px-3 py-1.5 text-xs font-semibold"
          >
            Refresh
          </button>
        </div>

        {isLoading ? <p className="text-sm text-gray-500">Loading dashboard data...</p> : null}
        {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="space-y-2">
            {recentTransactions.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{entry.description ?? "Untitled entry"}</p>
                  <p className="text-xs text-gray-500">{entry.reference_number ?? "No ref"} · {entry.date}</p>
                </div>
                <span className="app-pill px-2.5 py-1 text-xs uppercase">{entry.status}</span>
              </div>
            ))}
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
