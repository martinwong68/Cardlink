"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { accountingGet, accountingPatch } from "@/src/lib/accounting/client";
import type { VendorBillRow } from "@/src/lib/accounting/types";

const statuses: VendorBillRow["status"][] = ["draft", "approved", "partially_paid", "paid", "overdue", "voided"];

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount ?? 0);
}

export default function AccountingBillsPage() {
  const [bills, setBills] = useState<VendorBillRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ bills: VendorBillRow[] }>("/api/accounting/bills");
      setBills(response.bills ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load bills.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateStatus = async (billId: string, status: VendorBillRow["status"]) => {
    setMessage(null);
    try {
      await accountingPatch(`/api/accounting/bills/${billId}/status`, { status });
      await loadData();
      setMessage("Bill status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update bill status.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {message ? <p className="app-success px-3 py-2 text-sm">{message}</p> : null}
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Vendor Bills (Accounts Payable)</h2>
          <div className="flex gap-2">
            <Link
              href="/business/accounting/bills/new"
              className="app-primary-btn px-3 py-1.5 text-xs font-semibold"
            >
              + New Bill
            </Link>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-gray-500">Loading bills...</p> : null}

        {!isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bills.map((bill) => (
              <article key={bill.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-500">{bill.bill_number}</p>
                    <p className="mt-1 text-base font-semibold text-gray-800">{bill.vendor_name}</p>
                  </div>
                  <span className="app-pill px-2 py-1 text-[11px] uppercase">{bill.status}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-xl font-bold text-gray-900">{formatAmount(bill.total, bill.currency)}</p>
                  {bill.balance_due > 0 && bill.balance_due < bill.total ? (
                    <p className="text-xs text-orange-600">Due: {formatAmount(bill.balance_due, bill.currency)}</p>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">Due {bill.due_date}</p>
                {bill.payment_terms ? <p className="text-xs text-gray-400">Terms: {bill.payment_terms}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={bill.status}
                    onChange={(event) => void updateStatus(bill.id, event.target.value as VendorBillRow["status"])}
                    className="app-input px-2 py-1 text-xs"
                    aria-label={`Change status for ${bill.bill_number}`}
                  >
                    {statuses.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>{statusOption}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
            {bills.length === 0 ? <p className="text-sm text-gray-500">No vendor bills yet. Create one to track accounts payable.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
