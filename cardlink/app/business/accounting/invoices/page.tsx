"use client";

import { useEffect, useState } from "react";

import { accountingGet, accountingPatch } from "@/src/lib/accounting/client";
import type { InvoiceRow } from "@/src/lib/accounting/types";

const statuses: InvoiceRow["status"][] = ["draft", "sent", "paid", "overdue"];

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount ?? 0);
}

export default function AccountingInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ invoices: InvoiceRow[] }>("/api/accounting/invoices");
      setInvoices(response.invoices ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateStatus = async (invoiceId: string, status: InvoiceRow["status"]) => {
    setMessage(null);
    try {
      await accountingPatch(`/api/accounting/invoices/${invoiceId}/status`, { status });
      await loadData();
      setMessage("Invoice status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update invoice status.");
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      {message ? <p className="app-success px-3 py-2 text-sm">{message}</p> : null}
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Invoices</h2>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
        </div>
        {isLoading ? <p className="text-sm text-gray-500">Loading invoices...</p> : null}

        {!isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-mono text-gray-500">{invoice.invoice_number}</p>
                <p className="mt-1 text-base font-semibold text-gray-800">{invoice.client_name}</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{formatAmount(invoice.total, invoice.currency)}</p>
                <p className="mt-1 text-xs text-gray-500">Due {invoice.due_date}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="app-pill px-2 py-1 text-[11px] uppercase">{invoice.status}</span>
                  <select
                    value={invoice.status}
                    onChange={(event) => void updateStatus(invoice.id, event.target.value as InvoiceRow["status"])}
                    className="app-input px-2 py-1 text-xs"
                    aria-label={`Change status for ${invoice.invoice_number}`}
                  >
                    {statuses.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>{statusOption}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
            {invoices.length === 0 ? <p className="text-sm text-gray-500">No invoices yet.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
