"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { accountingGet, accountingPatch } from "@/src/lib/accounting/client";

type InvoiceItemRow = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
};

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  total: number;
  tax: number;
  currency: string;
  notes: string | null;
  items: InvoiceItemRow[];
};

type LineItem = {
  key: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

let nextKey = 1;
function toLine(item: InvoiceItemRow): LineItem {
  return {
    key: nextKey++,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
  };
}
function emptyLine(): LineItem {
  return { key: nextKey++, description: "", quantity: 1, unit_price: 0, tax_rate: 0 };
}

const statuses: InvoiceDetail["status"][] = ["draft", "sent", "paid", "overdue"];

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.invoiceId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<InvoiceDetail["status"]>("draft");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  useEffect(() => {
    (async () => {
      try {
        const res = await accountingGet<{ invoice: InvoiceDetail }>(
          `/api/accounting/invoices/${invoiceId}`,
        );
        const inv = res.invoice;
        setClientName(inv.client_name ?? "");
        setClientEmail(inv.client_email ?? "");
        setInvoiceNumber(inv.invoice_number ?? "");
        setIssueDate(inv.issue_date ?? "");
        setDueDate(inv.due_date ?? "");
        setStatus(inv.status ?? "draft");
        setCurrency(inv.currency ?? "USD");
        setNotes(inv.notes ?? "");
        setLines(inv.items.length > 0 ? inv.items.map(toLine) : [emptyLine()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const updateLine = useCallback((key: number, field: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }, []);

  const removeLine = useCallback((key: number) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });
  }, []);

  const addLine = useCallback(() => setLines((prev) => [...prev, emptyLine()]), []);

  const { subtotal, taxTotal, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const l of lines) {
      const amt = l.quantity * l.unit_price;
      sub += amt;
      tax += amt * (l.tax_rate / 100);
    }
    return {
      subtotal: Math.round(sub * 100) / 100,
      taxTotal: Math.round(tax * 100) / 100,
      total: Math.round((sub + tax) * 100) / 100,
    };
  }, [lines]);

  const canSave =
    clientName.trim().length > 0 &&
    invoiceNumber.trim().length > 0 &&
    lines.some((l) => l.description.trim().length > 0 && l.quantity > 0);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await accountingPatch(`/api/accounting/invoices/${invoiceId}`, {
        invoice_number: invoiceNumber.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        status,
        currency: currency.trim() || "USD",
        notes: notes.trim() || undefined,
        items: lines
          .filter((l) => l.description.trim().length > 0)
          .map((l) => ({
            description: l.description.trim(),
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate,
          })),
      });
      setSuccess("Invoice updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/accounting/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: { "x-cardlink-app-scope": "business" },
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Delete failed");
      }
      router.push("/business/accounting/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading invoice…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="app-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/business/accounting/invoices" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mb-2">
              <ArrowLeft className="h-3 w-3" /> Back to Invoices
            </Link>
            <h1 className="app-title text-xl font-bold">Edit Invoice</h1>
            <p className="app-subtitle mt-1 text-sm">Modify invoice details, line items, and status.</p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {/* Status */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Status</h2>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  status === s
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Customer */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Customer</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input type="text" placeholder="Customer name *" value={clientName} onChange={(e) => setClientName(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="email" placeholder="Email address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
          </div>
        </section>

        {/* Invoice Details */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Invoice Details</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <input type="text" placeholder="Invoice number *" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="text" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
          </div>
        </section>

        {/* Line Items */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
          <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_80px_100px_40px] gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1">
            <span>Description</span><span className="text-right">Qty</span><span className="text-right">Unit Price</span><span className="text-right">Tax %</span><span className="text-right">Amount</span><span />
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const amount = Math.round(line.quantity * line.unit_price * 100) / 100;
              return (
                <div key={line.key} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2 md:space-y-0 md:bg-transparent md:border-0 md:p-0 md:grid md:grid-cols-[1fr_80px_100px_80px_100px_40px] md:gap-2 md:items-center">
                  <span className="text-[11px] text-gray-400 md:hidden">Item {idx + 1}</span>
                  <input type="text" placeholder="Description" value={line.description} onChange={(e) => updateLine(line.key, "description", e.target.value)} className="app-input px-3 py-2 text-sm w-full" />
                  <div className="grid grid-cols-3 gap-2 md:contents">
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Qty</span>
                      <input type="number" min={0} step={1} value={line.quantity} onChange={(e) => updateLine(line.key, "quantity", Number(e.target.value))} className="app-input px-2 py-2 text-sm w-full text-right" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Price</span>
                      <input type="number" min={0} step={0.01} value={line.unit_price} onChange={(e) => updateLine(line.key, "unit_price", Number(e.target.value))} className="app-input px-2 py-2 text-sm w-full text-right" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Tax %</span>
                      <input type="number" min={0} step={0.1} value={line.tax_rate} onChange={(e) => updateLine(line.key, "tax_rate", Number(e.target.value))} className="app-input px-2 py-2 text-sm w-full text-right" />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-gray-700 hidden md:block">{fmt(amount)}</p>
                  <button type="button" onClick={() => removeLine(line.key)} className="text-gray-400 hover:text-red-500 justify-self-center" aria-label="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add line
          </button>
        </section>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="font-semibold">{fmt(taxTotal)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-bold text-gray-900">Total</span><span className="font-bold text-gray-900">{fmt(total)}</span></div>
          </div>
        </div>

        {/* Notes */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <textarea rows={3} placeholder="Internal notes or terms…" value={notes} onChange={(e) => setNotes(e.target.value)} className="app-input w-full px-3 py-2.5 text-sm" />
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/business/accounting/invoices" className="text-sm text-gray-500 hover:underline">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
