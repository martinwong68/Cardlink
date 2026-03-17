"use client";

import { useEffect, useMemo, useState } from "react";

import { accountingGet, accountingPost } from "@/src/lib/accounting/client";
import type { AccountRow } from "@/src/lib/accounting/types";

type AccountType = AccountRow["type"];

const typeOptions: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

export default function AccountingAccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await accountingGet<{ accounts: AccountRow[] }>("/api/accounting/accounts");
      setAccounts(response.accounts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const grouped = useMemo(() => {
    return typeOptions.map((groupType) => ({
      groupType,
      items: accounts.filter((account) => account.type === groupType),
    }));
  }, [accounts]);

  const createAccount = async () => {
    setMessage(null);
    try {
      await accountingPost("/api/accounting/accounts", {
        code,
        name,
        type,
      });
      setName("");
      setCode("");
      setType("asset");
      await loadData();
      setMessage("Account created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create account.");
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      <section className="app-card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-800">Create Account</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code" className="app-input px-3 py-2 text-sm" />
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="app-input px-3 py-2 text-sm md:col-span-2" />
          <select value={type} onChange={(event) => setType(event.target.value as AccountType)} className="app-input px-3 py-2 text-sm">
            {typeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void createAccount()} className="app-primary-btn px-4 py-2 text-sm font-semibold">Add Account</button>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-4 py-2 text-sm font-semibold">Refresh</button>
        </div>
      </section>

      {message ? <p className="app-error px-3 py-2 text-sm">{message}</p> : null}
      {isLoading ? <p className="text-sm text-gray-500">Loading accounts...</p> : null}

      {!isLoading ? (
        <section className="space-y-3">
          {grouped.map((group) => (
            <article key={group.groupType} className="app-card p-4 md:p-5">
              <h3 className="text-sm font-semibold capitalize text-gray-800">{group.groupType}</h3>
              <div className="mt-3 space-y-2">
                {group.items.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm">
                    <span className="font-semibold text-gray-700">{account.code} · {account.name}</span>
                    <span className="text-xs text-gray-500">{account.is_active ? "Active" : "Inactive"}</span>
                  </div>
                ))}
                {group.items.length === 0 ? <p className="text-sm text-gray-500">No accounts in this group.</p> : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
