"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { accountingPost } from "@/src/lib/accounting/client";

type BillItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

export default function NewBillPage() {
  const router = useRouter();
  const [billNumber, setBillNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BillItem[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await accountingPost("/api/accounting/bills", {
        bill_number: billNumber,
        vendor_name: vendorName,
        vendor_email: vendorEmail || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        payment_terms: paymentTerms || undefined,
        currency,
        notes: notes || undefined,
        items,
      });
      router.push("/business/accounting/bills");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create bill.");
    } finally {
      setIsSaving(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100, 0);
  const total = subtotal + taxTotal;

  return (
    <div className="space-y-4 pb-28">
      {message ? <p className="app-error px-3 py-2 text-sm">{message}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="app-card space-y-4 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-800">New Vendor Bill</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-600">Bill Number *</label>
            <input type="text" required value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="app-input mt-1 w-full" placeholder="BILL-001" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Vendor Name *</label>
            <input type="text" required value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Vendor Email</label>
            <input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="app-input mt-1 w-full">
              <option value="USD">USD</option>
              <option value="MYR">MYR</option>
              <option value="HKD">HKD</option>
              <option value="SGD">SGD</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Payment Terms</label>
            <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="app-input mt-1 w-full" placeholder="Net 30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="app-input mt-1 w-full" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-600">Line Items</h3>
            <button type="button" onClick={addItem} className="app-secondary-btn px-2 py-1 text-xs">+ Add Line</button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {index === 0 ? <label className="text-[10px] text-gray-500">Description</label> : null}
                  <input type="text" required value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} className="app-input w-full text-xs" />
                </div>
                <div className="col-span-2">
                  {index === 0 ? <label className="text-[10px] text-gray-500">Qty</label> : null}
                  <input type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)} className="app-input w-full text-xs" />
                </div>
                <div className="col-span-2">
                  {index === 0 ? <label className="text-[10px] text-gray-500">Price</label> : null}
                  <input type="number" min="0" step="0.01" required value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} className="app-input w-full text-xs" />
                </div>
                <div className="col-span-2">
                  {index === 0 ? <label className="text-[10px] text-gray-500">Tax %</label> : null}
                  <input type="number" min="0" step="0.01" value={item.tax_rate} onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)} className="app-input w-full text-xs" />
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{(item.quantity * item.unit_price).toFixed(2)}</span>
                  {items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-400 text-xs hover:text-red-600">✕</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-3">
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>Subtotal: <span className="font-semibold">{subtotal.toFixed(2)}</span></p>
            <p>Tax: <span className="font-semibold">{taxTotal.toFixed(2)}</span></p>
            <p className="text-sm font-bold">Total: {total.toFixed(2)} {currency}</p>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="app-primary-btn px-4 py-2 text-sm font-semibold"
          >
            {isSaving ? "Creating..." : "Create Bill"}
          </button>
        </div>
      </form>
    </div>
  );
}
