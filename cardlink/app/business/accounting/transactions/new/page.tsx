"use client";

import Link from "next/link";

export default function NewTransactionPage() {
  return (
    <div className="space-y-4 pb-28">
      <div className="app-card p-5 space-y-5">
        <div>
          <p className="app-kicker">Journal Entries</p>
          <h1 className="app-title mt-2 text-xl font-bold">New Journal Entry</h1>
          <p className="app-subtitle mt-1 text-sm">Record a double-entry journal transaction.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Entry Details</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="date" className="app-input px-3 py-2.5 text-sm" />
            <input type="text" placeholder="Reference number" className="app-input px-3 py-2.5 text-sm" />
            <input type="text" placeholder="Description" className="app-input px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Lines</h2>
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Debit / Credit line editor will be wired here
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <textarea rows={2} placeholder="Optional memo…" className="app-input px-3 py-2.5 text-sm" />
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Link href="/business/accounting/transactions" className="app-secondary-btn px-5 py-2.5 text-sm font-semibold">
            Cancel
          </Link>
          <button type="button" disabled className="app-primary-btn px-5 py-2.5 text-sm font-semibold opacity-50 cursor-not-allowed">
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}
