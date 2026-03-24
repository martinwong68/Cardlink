"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type RecurringItem = { description: string; quantity: number; unit_price: number; tax_rate: number };
type RecurringInvoice = {
  id: string;
  title: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  next_issue_date: string;
  end_date: string | null;
  total: number;
  currency: string;
  is_active: boolean;
  items: RecurringItem[];
};

const frequencies: RecurringInvoice["frequency"][] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

const frequencyLabels: Record<RecurringInvoice["frequency"], string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function formatAmount(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value ?? 0);
}

const emptyItem = (): RecurringItem => ({ description: "", quantity: 1, unit_price: 0, tax_rate: 0 });

export default function RecurringInvoicesPage() {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<RecurringInvoice["frequency"]>("monthly");
  const [nextIssueDate, setNextIssueDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState<RecurringItem[]>([emptyItem()]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounting/recurring-invoices", { headers: HEADERS, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load recurring invoices");
      const json = await res.json();
      setInvoices(json.recurring_invoices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recurring invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = invoices.filter(
    (inv) => inv.title.toLowerCase().includes(search.toLowerCase()),
  );

  const updateItem = (idx: number, field: keyof RecurringItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const grandTotal = items.reduce((s, it) => s + it.quantity * it.unit_price * (1 + it.tax_rate / 100), 0);

  const clearForm = () => {
    setTitle(""); setFrequency("monthly"); setNextIssueDate("");
    setEndDate(""); setItems([emptyItem()]);
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/accounting/recurring-invoices", {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, frequency, next_issue_date: nextIssueDate,
          end_date: endDate || null, items,
        }),
      });
      if (!res.ok) throw new Error("Failed to create recurring invoice");
      clearForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recurring invoice.");
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    setError(null);
    try {
      const res = await fetch(`/api/accounting/recurring-invoices/${id}`, {
        method: "PATCH",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentState }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Recurring Invoices</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> New Recurring
            </button>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recurring invoices…" className="app-input w-full py-2 pl-9 pr-3 text-sm" />
        </div>

        {error ? <p className="app-error mb-3 px-3 py-2 text-sm">{error}</p> : null}
      </section>

      {/* Create form */}
      {showForm ? (
        <section className="app-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">New Recurring Invoice</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="app-input px-3 py-2 text-sm" />
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringInvoice["frequency"])} className="app-input px-3 py-2 text-sm">
              {frequencies.map((f) => <option key={f} value={f}>{frequencyLabels[f]}</option>)}
            </select>
            <input value={nextIssueDate} onChange={(e) => setNextIssueDate(e.target.value)} type="date" className="app-input px-3 py-2 text-sm" aria-label="Next issue date" />
            <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="app-input px-3 py-2 text-sm" aria-label="End date (optional)" placeholder="End date" />
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Line Items</p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2">
                <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Description" className="app-input px-2 py-1.5 text-sm" />
                <input value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} type="number" min="0" placeholder="Qty" className="app-input px-2 py-1.5 text-sm" />
                <input value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} type="number" min="0" step="0.01" placeholder="Price" className="app-input px-2 py-1.5 text-sm" />
                <input value={item.tax_rate} onChange={(e) => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)} type="number" min="0" step="0.01" placeholder="Tax %" className="app-input px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500" disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">+ Add line</button>

          <div className="mt-3 flex items-center justify-end rounded-xl bg-gray-50 px-4 py-2">
            <p className="text-base font-bold text-gray-900">Total: {formatAmount(grandTotal)}</p>
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => void handleCreate()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Create Recurring Invoice</button>
          </div>
        </section>
      ) : null}

      {/* Table */}
      {loading ? <p className="text-sm text-gray-500">Loading recurring invoices…</p> : null}
      {!loading ? (
        <section className="app-card p-4 md:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-gray-500">
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Frequency</th>
                  <th className="px-2 py-2">Next Issue</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2 text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="px-2 py-2 font-semibold text-gray-700">{inv.title}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <RefreshCw className="h-3 w-3 text-gray-400" /> {frequencyLabels[inv.frequency]}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-gray-500">{inv.next_issue_date}</td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-900">{formatAmount(inv.total, inv.currency)}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleActive(inv.id, inv.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${inv.is_active ? "bg-indigo-600" : "bg-gray-300"}`}
                        aria-label={`Toggle ${inv.title}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${inv.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="mt-3 text-sm text-gray-500">No recurring invoices found.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
