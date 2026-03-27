"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, RefreshCw, X } from "lucide-react";
import { accountingGet, accountingPost } from "@/src/lib/accounting/client";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

type AccountWithBalance = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  is_active: boolean;
  total_debit: number;
  total_credit: number;
  balance: number;
};

type TransactionLine = {
  id: string;
  transaction_id: string;
  date: string | null;
  reference_number: string | null;
  tx_description: string | null;
  line_description: string | null;
  debit: number;
  credit: number;
  currency: string;
  created_at: string;
};

const typeOptions: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const typeLabels: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

const typeColors: Record<AccountType, string> = {
  asset: "bg-blue-50 border-blue-200 text-blue-800",
  liability: "bg-red-50 border-red-200 text-red-800",
  equity: "bg-purple-50 border-purple-200 text-purple-800",
  revenue: "bg-emerald-50 border-emerald-200 text-emerald-800",
  expense: "bg-amber-50 border-amber-200 text-amber-800",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AccountingAccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Drill-down state
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [accountLines, setAccountLines] = useState<TransactionLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ accounts: AccountWithBalance[] }>("/api/accounting/account-balances");
      setAccounts(response.accounts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadAccountLines = useCallback(async (accountId: string) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      setAccountLines([]);
      return;
    }
    setExpandedAccountId(accountId);
    setLinesLoading(true);
    try {
      const response = await accountingGet<{ lines: TransactionLine[] }>(
        `/api/accounting/account-balances?account_id=${accountId}`
      );
      setAccountLines(response.lines ?? []);
    } catch {
      setAccountLines([]);
    } finally {
      setLinesLoading(false);
    }
  }, [expandedAccountId]);

  const grouped = useMemo(() => {
    return typeOptions.map((groupType) => {
      const items = accounts.filter((account) => account.type === groupType);
      const groupTotal = items.reduce((sum, acc) => sum + acc.balance, 0);
      return { groupType, items, groupTotal };
    });
  }, [accounts]);

  const toggleGroup = (groupType: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupType)) next.delete(groupType);
      else next.add(groupType);
      return next;
    });
  };

  const createAccount = async () => {
    setMessage(null);
    try {
      await accountingPost("/api/accounting/accounts", { code, name, type });
      setName("");
      setCode("");
      setType("asset");
      setShowForm(false);
      await loadData();
      setMessage("Account created successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create account.");
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">Click any account to view transaction details</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button type="button" onClick={() => setShowForm(!showForm)} className="app-primary-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New Account
          </button>
        </div>
      </div>

      {/* Create Account Form */}
      {showForm && (
        <section className="app-card p-4 md:p-5 border-l-4 border-indigo-400">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Create New Account</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. 1001)" className="app-input px-3 py-2 text-sm" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account Name" className="app-input px-3 py-2 text-sm md:col-span-2" />
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="app-input px-3 py-2 text-sm">
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>{typeLabels[opt]}</option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => void createAccount()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Add Account</button>
          </div>
        </section>
      )}

      {message && (
        <div className={`px-3 py-2 text-sm rounded-lg ${message.includes("success") || message.includes("created") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading accounts...</p>}

      {/* Chart of Accounts with Balances */}
      {!isLoading && (
        <section className="space-y-3">
          {grouped.map((group) => {
            const isCollapsed = collapsedGroups.has(group.groupType);
            return (
              <article key={group.groupType} className="app-card overflow-hidden">
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupType)}
                  className={`w-full flex items-center justify-between px-4 py-3 border-b ${typeColors[group.groupType]}`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <h3 className="text-sm font-bold uppercase tracking-wide">{typeLabels[group.groupType]}</h3>
                    <span className="text-xs opacity-70">({group.items.length} accounts)</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    ${formatCurrency(group.groupTotal)}
                  </span>
                </button>

                {/* Account Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-50">
                    {group.items.map((account) => {
                      const isExpanded = expandedAccountId === account.id;
                      return (
                        <div key={account.id}>
                          <button
                            type="button"
                            onClick={() => void loadAccountLines(account.id)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${isExpanded ? "bg-indigo-50/50" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                              <span className="font-mono text-xs text-gray-500 w-14 text-left">{account.code}</span>
                              <span className="font-semibold text-gray-700">{account.name}</span>
                              {!account.is_active && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400 hidden md:inline">
                                Dr: ${formatCurrency(account.total_debit)} / Cr: ${formatCurrency(account.total_credit)}
                              </span>
                              <span className={`font-bold tabular-nums ${account.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                                ${formatCurrency(Math.abs(account.balance))}
                                {account.balance < 0 && <span className="text-xs ml-0.5">(Cr)</span>}
                              </span>
                            </div>
                          </button>

                          {/* Drill-down: Transaction Lines */}
                          {isExpanded && (
                            <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100">
                              {linesLoading ? (
                                <p className="text-xs text-gray-500">Loading transactions...</p>
                              ) : accountLines.length === 0 ? (
                                <p className="text-xs text-gray-500">No transactions found for this account.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-gray-500 border-b border-gray-200">
                                        <th className="pb-2 pr-3 font-semibold">Date</th>
                                        <th className="pb-2 pr-3 font-semibold">Reference</th>
                                        <th className="pb-2 pr-3 font-semibold">Description</th>
                                        <th className="pb-2 pr-3 font-semibold text-right">Debit</th>
                                        <th className="pb-2 font-semibold text-right">Credit</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {accountLines.map((line) => (
                                        <tr key={line.id} className="hover:bg-white/60">
                                          <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">
                                            {line.date ? new Date(line.date).toLocaleDateString() : "—"}
                                          </td>
                                          <td className="py-1.5 pr-3 text-gray-500 font-mono">
                                            {line.reference_number || "—"}
                                          </td>
                                          <td className="py-1.5 pr-3 text-gray-700 max-w-[200px] truncate">
                                            {line.line_description || line.tx_description || "—"}
                                          </td>
                                          <td className="py-1.5 pr-3 text-right tabular-nums text-gray-800">
                                            {line.debit > 0 ? `$${formatCurrency(line.debit)}` : ""}
                                          </td>
                                          <td className="py-1.5 text-right tabular-nums text-gray-800">
                                            {line.credit > 0 ? `$${formatCurrency(line.credit)}` : ""}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                                        <td colSpan={3} className="pt-2 pr-3">Total</td>
                                        <td className="pt-2 pr-3 text-right tabular-nums">
                                          ${formatCurrency(accountLines.reduce((s, l) => s + l.debit, 0))}
                                        </td>
                                        <td className="pt-2 text-right tabular-nums">
                                          ${formatCurrency(accountLines.reduce((s, l) => s + l.credit, 0))}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {group.items.length === 0 && (
                      <p className="text-sm text-gray-500 px-4 py-3">No accounts in this group.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
