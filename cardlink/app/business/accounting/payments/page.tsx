"use client";

import { useEffect, useState } from "react";

import { accountingGet, accountingPost } from "@/src/lib/accounting/client";
import type { PaymentRow } from "@/src/lib/accounting/types";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount ?? 0);
}

export default function AccountingPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  /* Quick-add payment form state */
  const [paymentNumber, setPaymentNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"received" | "made">("received");
  const [relatedType, setRelatedType] = useState<"invoice" | "vendor_bill">("invoice");
  const [relatedId, setRelatedId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ payments: PaymentRow[] }>("/api/accounting/payments");
      setPayments(response.payments ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load payments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await accountingPost("/api/accounting/payments", {
        payment_number: paymentNumber,
        payment_type: paymentType,
        related_type: relatedType,
        related_id: relatedId,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference: reference || undefined,
      });
      setShowForm(false);
      setPaymentNumber("");
      setRelatedId("");
      setAmount("");
      setReference("");
      await loadData();
      setMessage("Payment recorded successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalReceived = payments.filter((p) => p.payment_type === "received").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalMade = payments.filter((p) => p.payment_type === "made").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4 pb-28">
      {message ? <p className="app-success px-3 py-2 text-sm">{message}</p> : null}

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="app-card p-4">
          <p className="text-xs text-gray-500">Total Received (AR)</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(totalReceived, "USD")}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs text-gray-500">Total Paid (AP)</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(totalMade, "USD")}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs text-gray-500">Net Cash Flow</p>
          <p className="text-xl font-bold text-gray-900">{formatAmount(totalReceived - totalMade, "USD")}</p>
        </div>
      </div>

      {/* Quick Add Payment */}
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Payments</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn px-3 py-1.5 text-xs font-semibold">
              {showForm ? "Cancel" : "+ Record Payment"}
            </button>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        {showForm ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="mb-4 space-y-3 rounded-lg border border-gray-100 p-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Payment # *</label>
                <input type="text" required value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} className="app-input mt-1 w-full" placeholder="PMT-001" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Type *</label>
                <select value={paymentType} onChange={(e) => { setPaymentType(e.target.value as "received" | "made"); setRelatedType(e.target.value === "received" ? "invoice" : "vendor_bill"); }} className="app-input mt-1 w-full">
                  <option value="received">Received (from customer)</option>
                  <option value="made">Made (to vendor)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">{relatedType === "invoice" ? "Invoice" : "Bill"} ID *</label>
                <input type="text" required value={relatedId} onChange={(e) => setRelatedId(e.target.value)} className="app-input mt-1 w-full" placeholder="UUID" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Amount *</label>
                <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="app-input mt-1 w-full">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Reference</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={isSaving} className="app-primary-btn w-full py-2 text-xs font-semibold">
                  {isSaving ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {isLoading ? <p className="text-sm text-gray-500">Loading payments...</p> : null}

        {!isLoading ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-gray-50 p-3">
                <div>
                  <p className="text-xs font-mono text-gray-500">{payment.payment_number}</p>
                  <p className="text-sm font-semibold text-gray-800">{payment.payment_date}</p>
                  <p className="text-xs text-gray-400">{payment.payment_type === "received" ? "↓ Received" : "↑ Paid"} • {payment.payment_method} • {payment.related_type}</p>
                </div>
                <p className={`text-lg font-bold ${payment.payment_type === "received" ? "text-green-600" : "text-red-600"}`}>
                  {payment.payment_type === "received" ? "+" : "−"}{formatAmount(payment.amount, payment.currency)}
                </p>
              </div>
            ))}
            {payments.length === 0 ? <p className="text-sm text-gray-500">No payments recorded yet.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
