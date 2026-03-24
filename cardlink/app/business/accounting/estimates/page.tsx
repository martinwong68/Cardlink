"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Plus, Search, Trash2, X } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type LineItem = { description: string; quantity: number; unit_price: number; tax_rate: number };
type Estimate = {
  id: string;
  estimate_number: string;
  title: string;
  contact_name: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  total: number;
  currency: string;
  issue_date: string;
  items: LineItem[];
};

const statusColors: Record<Estimate["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-600",
  expired: "bg-amber-50 text-amber-600",
  converted: "bg-purple-50 text-purple-600",
};

function formatAmount(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value ?? 0);
}

const emptyItem = (): LineItem => ({ description: "", quantity: 1, unit_price: 0, tax_rate: 0 });

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounting/estimates", { headers: HEADERS, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load estimates");
      const json = await res.json();
      setEstimates(json.estimates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estimates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = estimates.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.estimate_number.toLowerCase().includes(search.toLowerCase()) ||
      e.contact_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const taxTotal = items.reduce((s, it) => s + it.quantity * it.unit_price * (it.tax_rate / 100), 0);
  const grandTotal = subtotal + taxTotal;

  const clearForm = () => {
    setTitle(""); setContactName(""); setIssueDate(""); setItems([emptyItem()]);
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/accounting/estimates", {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ title, contact_name: contactName, issue_date: issueDate, items }),
      });
      if (!res.ok) throw new Error("Failed to create estimate");
      clearForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create estimate.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Estimates</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> New Estimate
            </button>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search estimates…" className="app-input w-full py-2 pl-9 pr-3 text-sm" />
        </div>

        {error ? <p className="app-error mb-3 px-3 py-2 text-sm">{error}</p> : null}
      </section>

      {/* Create form */}
      {showForm ? (
        <section className="app-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">New Estimate</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="app-input px-3 py-2 text-sm" />
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact Name" className="app-input px-3 py-2 text-sm" />
            <input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="app-input px-3 py-2 text-sm" />
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

          <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2">
            <div className="space-y-0.5 text-xs text-gray-500">
              <p>Subtotal: {formatAmount(subtotal)}</p>
              <p>Tax: {formatAmount(taxTotal)}</p>
            </div>
            <p className="text-base font-bold text-gray-900">Total: {formatAmount(grandTotal)}</p>
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => void handleCreate()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Create Estimate</button>
          </div>
        </section>
      ) : null}

      {/* Table */}
      {loading ? <p className="text-sm text-gray-500">Loading estimates…</p> : null}
      {!loading ? (
        <section className="app-card p-4 md:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-gray-500">
                  <th className="px-2 py-2">Number</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2">Issue Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((est) => (
                  <tr key={est.id} className="border-t border-gray-100">
                    <td className="px-2 py-2 font-mono text-xs text-gray-500">{est.estimate_number}</td>
                    <td className="px-2 py-2 font-semibold text-gray-700">{est.title}</td>
                    <td className="px-2 py-2 text-gray-600">{est.contact_name}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[est.status] ?? ""}`}>{est.status}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-900">{formatAmount(est.total, est.currency)}</td>
                    <td className="px-2 py-2 text-gray-500">{est.issue_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="mt-3 text-sm text-gray-500">No estimates found.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
