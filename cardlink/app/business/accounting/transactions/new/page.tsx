"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountingGet, accountingPost } from "@/src/lib/accounting/client";
import type { AccountRow } from "@/src/lib/accounting/types";

type LineDraft = {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
};

const emptyLine = (): LineDraft => ({ account_id: "", debit: "", credit: "", description: "" });

export default function NewTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountingGet<{ accounts: AccountRow[] }>("/api/accounting/accounts")
      .then((res) => setAccounts(res.accounts ?? []))
      .catch(() => {});
  }, []);

  const updateLine = (idx: number, field: keyof LineDraft, value: string) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      // If debit is entered, clear credit and vice versa
      if (field === "debit" && Number(value) > 0) updated.credit = "";
      if (field === "credit" && Number(value) > 0) updated.debit = "";
      return updated;
    }));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const debitTotal = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const creditTotal = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = debitTotal > 0 && creditTotal > 0 && Math.abs(debitTotal - creditTotal) < 0.01;
  const validLines = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
  const canSave = isBalanced && validLines.length >= 2;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await accountingPost("/api/accounting/transactions", {
        date,
        description: description.trim() || null,
        reference_number: reference.trim() || null,
        status: "posted",
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          currency: "USD",
          description: l.description.trim() || null,
        })),
      });
      router.push("/business/accounting/transactions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="app-card p-5 space-y-5">
        <div>
          <p className="app-kicker">Journal Entries</p>
          <h1 className="app-title mt-2 text-xl font-bold">New Journal Entry</h1>
          <p className="app-subtitle mt-1 text-sm">Record a double-entry journal transaction.</p>
        </div>

        {error && <p className="app-error px-3 py-2 text-sm">{error}</p>}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Entry Details</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="text" placeholder="Reference number" value={reference} onChange={(e) => setReference(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Debit / Credit Lines</h2>
            <button type="button" onClick={addLine} className="text-xs font-semibold text-indigo-600 hover:underline">+ Add Line</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                  <th className="pb-2 pr-2 w-2/5">Account</th>
                  <th className="pb-2 pr-2 w-1/6 text-right">Debit</th>
                  <th className="pb-2 pr-2 w-1/6 text-right">Credit</th>
                  <th className="pb-2 pr-2">Description</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        value={line.account_id}
                        onChange={(e) => updateLine(idx, "account_id", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="">Select account…</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) => updateLine(idx, "debit", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) => updateLine(idx, "credit", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Line description"
                        value={line.description}
                        onChange={(e) => updateLine(idx, "description", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      {lines.length > 2 && (
                        <button type="button" onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold border-t border-gray-300">
                  <td className="py-2 pr-2 text-gray-700">Totals</td>
                  <td className={`py-2 pr-2 text-right ${isBalanced ? "text-emerald-600" : "text-red-500"}`}>
                    ${debitTotal.toFixed(2)}
                  </td>
                  <td className={`py-2 pr-2 text-right ${isBalanced ? "text-emerald-600" : "text-red-500"}`}>
                    ${creditTotal.toFixed(2)}
                  </td>
                  <td colSpan={2} className="py-2">
                    {!isBalanced && debitTotal > 0 && creditTotal > 0 && (
                      <span className="text-xs text-red-500">Difference: ${Math.abs(debitTotal - creditTotal).toFixed(2)}</span>
                    )}
                    {isBalanced && (
                      <span className="text-xs text-emerald-600">✓ Balanced</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <textarea rows={2} placeholder="Optional memo…" value={notes} onChange={(e) => setNotes(e.target.value)} className="app-input px-3 py-2.5 text-sm" />
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Link href="/business/accounting/transactions" className="app-secondary-btn px-5 py-2.5 text-sm font-semibold">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
            className="app-primary-btn px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
