"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { accountingPost } from "@/src/lib/accounting/client";

type LineItem = {
  key: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

let nextKey = 1;
function emptyLine(): LineItem {
  return { key: nextKey++, description: "", quantity: 1, unit_price: 0, tax_rate: 0 };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLine = useCallback((key: number, field: keyof LineItem, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)),
    );
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
    try {
      await accountingPost("/api/accounting/invoices", {
        invoice_number: invoiceNumber.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        status: "draft",
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
      router.push("/business/accounting/invoices");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-4 pb-28">
      <div className="app-card p-5 space-y-5">
        <div>
          <p className="app-kicker">Invoices</p>
          <h1 className="app-title mt-2 text-xl font-bold">Create Invoice</h1>
          <p className="app-subtitle mt-1 text-sm">Fill in the details below to create a new invoice.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Customer */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Customer</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Customer name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="app-input px-3 py-2.5 text-sm"
            />
            <input
              type="email"
              placeholder="Email address"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="app-input px-3 py-2.5 text-sm"
            />
          </div>
        </section>

        {/* Invoice Details */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Invoice Details</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Invoice number *"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="app-input px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="app-input px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="app-input px-3 py-2.5 text-sm"
            />
          </div>
        </section>

        {/* Line Items */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>

          {/* Desktop table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_80px_100px_40px] gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit Price</span>
            <span className="text-right">Tax %</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const amount = Math.round(line.quantity * line.unit_price * 100) / 100;
              return (
                <div
                  key={line.key}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2 md:space-y-0 md:bg-transparent md:border-0 md:p-0 md:grid md:grid-cols-[1fr_80px_100px_80px_100px_40px] md:gap-2 md:items-center"
                >
                  {/* Mobile label */}
                  <span className="text-[11px] text-gray-400 md:hidden">Item {idx + 1}</span>

                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(line.key, "description", e.target.value)}
                    className="app-input px-3 py-2 text-sm w-full"
                  />

                  <div className="grid grid-cols-3 gap-2 md:contents">
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Qty</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, "quantity", Math.max(0, Number(e.target.value)))}
                        className="app-input px-2 py-2 text-sm text-right w-full"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Price</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.key, "unit_price", Math.max(0, Number(e.target.value)))}
                        className="app-input px-2 py-2 text-sm text-right w-full"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 md:hidden">Tax %</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={line.tax_rate}
                        onChange={(e) => updateLine(line.key, "tax_rate", Math.max(0, Number(e.target.value)))}
                        className="app-input px-2 py-2 text-sm text-right w-full"
                      />
                    </div>
                  </div>

                  {/* Amount + delete */}
                  <div className="flex items-center justify-between md:contents">
                    <span className="text-sm font-semibold text-gray-800 md:text-right">
                      {fmt(amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add line item
          </button>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span>{fmt(taxTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <textarea
            rows={3}
            placeholder="Add notes or payment terms…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="app-input px-3 py-2.5 text-sm"
          />
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Link href="/business/accounting/invoices" className="app-secondary-btn px-5 py-2.5 text-sm font-semibold">
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className={`app-primary-btn px-5 py-2.5 text-sm font-semibold ${
              !canSave || saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saving ? "Saving…" : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
