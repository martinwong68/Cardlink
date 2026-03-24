"use client";

import { useEffect, useState, useCallback } from "react";
import { Landmark, Plus, Search, X } from "lucide-react";

const HEADERS = { "x-cardlink-app-scope": "business" };

type BankAccount = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  currency: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
};

const currencies = ["MYR", "HKD", "SGD", "USD"];

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value ?? 0);
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [openingBalance, setOpeningBalance] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounting/bank-accounts", { headers: HEADERS, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load bank accounts");
      const json = await res.json();
      setAccounts(json.bank_accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = accounts.filter(
    (a) =>
      a.bank_name.toLowerCase().includes(search.toLowerCase()) ||
      a.account_name.toLowerCase().includes(search.toLowerCase()),
  );

  const clearForm = () => {
    setBankName(""); setAccountName(""); setAccountNumber("");
    setRoutingNumber(""); setCurrency("MYR"); setOpeningBalance("");
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/accounting/bank-accounts", {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName, account_name: accountName,
          account_number: accountNumber, routing_number: routingNumber,
          currency, opening_balance: parseFloat(openingBalance) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to create bank account");
      clearForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bank account.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Bank Accounts</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add Account
            </button>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bank accounts…" className="app-input w-full py-2 pl-9 pr-3 text-sm" />
        </div>

        {error ? <p className="app-error mb-3 px-3 py-2 text-sm">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-500">Loading bank accounts…</p> : null}
      </section>

      {/* Create form modal */}
      {showForm ? (
        <section className="app-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">New Bank Account</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" className="app-input px-3 py-2 text-sm" />
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" className="app-input px-3 py-2 text-sm" />
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" className="app-input px-3 py-2 text-sm" />
            <input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder="Routing Number" className="app-input px-3 py-2 text-sm" />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="app-input px-3 py-2 text-sm">
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Opening Balance" type="number" step="0.01" className="app-input px-3 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => void handleCreate()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Create Account</button>
          </div>
        </section>
      ) : null}

      {/* Card grid */}
      {!loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((acct) => (
            <article key={acct.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{acct.bank_name}</p>
                    <p className="text-xs text-gray-500">{acct.account_name}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${acct.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                  {acct.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-xl font-bold text-gray-900">{formatAmount(acct.current_balance, acct.currency)}</p>
              <p className="mt-1 text-xs text-gray-500">{acct.currency}</p>
            </article>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-gray-500">No bank accounts found.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
