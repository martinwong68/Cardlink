"use client";

import { useEffect, useState } from "react";

import { accountingGet, accountingPost, accountingPatch } from "@/src/lib/accounting/client";
import type { BankAccountRow, BankTransactionRow, BankReconciliationRow } from "@/src/lib/accounting/types";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount ?? 0);
}

export default function AccountingBankingPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransactionRow[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"accounts" | "transactions" | "reconciliation">("accounts");

  /* New account form */
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* Reconciliation form */
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [acctRes, txnRes, reconRes] = await Promise.all([
        accountingGet<{ bank_accounts: BankAccountRow[] }>("/api/accounting/bank-accounts"),
        accountingGet<{ bank_transactions: BankTransactionRow[] }>("/api/accounting/bank-transactions"),
        accountingGet<{ reconciliations: BankReconciliationRow[] }>("/api/accounting/bank-reconciliations"),
      ]);
      setBankAccounts(acctRes.bank_accounts ?? []);
      setBankTransactions(txnRes.bank_transactions ?? []);
      setReconciliations(reconRes.reconciliations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load banking data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await accountingPost("/api/accounting/bank-accounts", {
        account_name: accountName,
        account_number: accountNumber || undefined,
        bank_name: bankName || undefined,
        opening_balance: parseFloat(openingBalance) || 0,
      });
      setShowAccountForm(false);
      setAccountName("");
      setAccountNumber("");
      setBankName("");
      setOpeningBalance("");
      await loadData();
      setMessage("Bank account created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create bank account.");
    } finally {
      setIsSaving(false);
    }
  };

  const startReconciliation = async () => {
    if (!selectedBankAccount || !statementBalance) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await accountingPost("/api/accounting/bank-reconciliations", {
        bank_account_id: selectedBankAccount,
        statement_date: statementDate,
        statement_balance: parseFloat(statementBalance),
      });
      await loadData();
      setMessage("Reconciliation created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start reconciliation.");
    } finally {
      setIsSaving(false);
    }
  };

  const matchTransaction = async (bankTxnId: string) => {
    setMessage(null);
    try {
      await accountingPatch("/api/accounting/bank-reconciliations", {
        bank_transaction_id: bankTxnId,
      });
      await loadData();
      setMessage("Transaction marked as reconciled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to match transaction.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {message ? <p className="app-success px-3 py-2 text-sm">{message}</p> : null}

      {/* Tabs */}
      <div className="flex gap-1">
        {(["accounts", "transactions", "reconciliation"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg ${activeTab === tab ? "bg-white border border-b-0 border-gray-200 text-gray-800" : "bg-gray-50 text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "accounts" ? "Bank Accounts" : tab === "transactions" ? "Transactions" : "Reconciliation"}
          </button>
        ))}
      </div>

      {/* Bank Accounts Tab */}
      {activeTab === "accounts" ? (
        <section className="app-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Bank Accounts</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAccountForm(!showAccountForm)} className="app-primary-btn px-3 py-1.5 text-xs font-semibold">
                {showAccountForm ? "Cancel" : "+ Add Account"}
              </button>
              <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
            </div>
          </div>

          {showAccountForm ? (
            <form onSubmit={(e) => void createAccount(e)} className="mb-4 space-y-3 rounded-lg border border-gray-100 p-3">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Account Name *</label>
                  <input type="text" required value={accountName} onChange={(e) => setAccountName(e.target.value)} className="app-input mt-1 w-full" placeholder="Main Business Account" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="app-input mt-1 w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="app-input mt-1 w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Opening Balance</label>
                  <input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="app-input mt-1 w-full" />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="app-primary-btn px-4 py-2 text-xs font-semibold">
                {isSaving ? "Creating..." : "Create Account"}
              </button>
            </form>
          ) : null}

          {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {bankAccounts.map((acct) => (
                <div key={acct.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-base font-semibold text-gray-800">{acct.account_name}</p>
                  {acct.bank_name ? <p className="text-xs text-gray-500">{acct.bank_name}</p> : null}
                  {acct.account_number ? <p className="text-xs font-mono text-gray-400">•••• {acct.account_number.slice(-4)}</p> : null}
                  <p className="mt-2 text-xl font-bold text-gray-900">{formatAmount(acct.current_balance, acct.currency)}</p>
                  <span className={`mt-1 inline-block text-[10px] uppercase ${acct.is_active ? "text-green-600" : "text-gray-400"}`}>
                    {acct.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
              {bankAccounts.length === 0 ? <p className="text-sm text-gray-500">No bank accounts yet.</p> : null}
            </div>
          )}
        </section>
      ) : null}

      {/* Bank Transactions Tab */}
      {activeTab === "transactions" ? (
        <section className="app-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Bank Transactions</h2>
            <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
          </div>

          {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
            <div className="space-y-2">
              {bankTransactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between rounded-lg border border-gray-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{txn.description}</p>
                    <p className="text-xs text-gray-400">{txn.transaction_date} • {txn.source}</p>
                    {txn.reference ? <p className="text-xs text-gray-400">Ref: {txn.reference}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatAmount(txn.amount, "USD")}
                    </p>
                    <span className={`text-[10px] uppercase ${txn.is_reconciled ? "text-green-600" : "text-orange-500"}`}>
                      {txn.is_reconciled ? "✓ Reconciled" : "Unreconciled"}
                    </span>
                  </div>
                </div>
              ))}
              {bankTransactions.length === 0 ? <p className="text-sm text-gray-500">No bank transactions. Import a bank statement to get started.</p> : null}
            </div>
          )}
        </section>
      ) : null}

      {/* Reconciliation Tab */}
      {activeTab === "reconciliation" ? (
        <section className="app-card p-4 md:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Bank Reconciliation</h2>

          {/* Start new reconciliation */}
          <div className="rounded-lg border border-gray-100 p-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-600">Start New Reconciliation</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="text-xs text-gray-500">Bank Account</label>
                <select value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)} className="app-input mt-1 w-full">
                  <option value="">Select...</option>
                  {bankAccounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>{acct.account_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Statement Date</label>
                <input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Statement Balance</label>
                <input type="number" step="0.01" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="app-input mt-1 w-full" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => void startReconciliation()} disabled={isSaving} className="app-primary-btn w-full py-2 text-xs font-semibold">
                  Start Reconciliation
                </button>
              </div>
            </div>
          </div>

          {/* Unreconciled transactions */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Unreconciled Transactions</h3>
            {bankTransactions.filter((t) => !t.is_reconciled).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between rounded-lg border border-orange-50 p-3 mb-1">
                <div>
                  <p className="text-sm text-gray-800">{txn.description}</p>
                  <p className="text-xs text-gray-400">{txn.transaction_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{formatAmount(txn.amount, "USD")}</p>
                  <button type="button" onClick={() => void matchTransaction(txn.id)} className="app-secondary-btn px-2 py-1 text-xs">Mark Reconciled</button>
                </div>
              </div>
            ))}
            {bankTransactions.filter((t) => !t.is_reconciled).length === 0 ? <p className="text-xs text-gray-400">All transactions reconciled.</p> : null}
          </div>

          {/* Reconciliation history */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Reconciliation History</h3>
            {reconciliations.map((recon) => (
              <div key={recon.id} className="flex items-center justify-between rounded-lg border border-gray-50 p-3 mb-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Statement: {recon.statement_date}</p>
                  <p className="text-xs text-gray-400">Matched: {recon.matched_count} | Unmatched: {recon.unmatched_count}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Balance: {formatAmount(recon.statement_balance, "USD")}</p>
                  <p className={`text-xs font-semibold ${recon.difference === 0 ? "text-green-600" : "text-red-600"}`}>
                    Diff: {formatAmount(recon.difference, "USD")}
                  </p>
                  <span className={`text-[10px] uppercase ${recon.status === "completed" ? "text-green-600" : "text-orange-500"}`}>
                    {recon.status}
                  </span>
                </div>
              </div>
            ))}
            {reconciliations.length === 0 ? <p className="text-xs text-gray-400">No reconciliation history.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
