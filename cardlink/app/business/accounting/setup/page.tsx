"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { accountingGet, accountingPost } from "@/src/lib/accounting/client";

type DefaultAccount = { code: string; name: string; type: string };

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "HKD", label: "HKD — Hong Kong Dollar" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
];

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

const TYPE_COLORS: Record<AccountType, string> = {
  asset: "bg-blue-50 text-blue-700 border-blue-200",
  liability: "bg-orange-50 text-orange-700 border-orange-200",
  equity: "bg-purple-50 text-purple-700 border-purple-200",
  revenue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense: "bg-rose-50 text-rose-700 border-rose-200",
};

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? "w-6 bg-indigo-600"
              : i + 1 < current
                ? "w-2 bg-indigo-400"
                : "w-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function AccountingSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Step 1 fields
  const [currency, setCurrency] = useState("USD");

  // Step 2 fields — default chart of accounts
  const [defaultAccounts, setDefaultAccounts] = useState<DefaultAccount[]>([]);
  const [accountsCount, setAccountsCount] = useState(0);

  const loadSetupStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingGet<{
        is_setup_complete: boolean;
        accounts_count: number;
        default_accounts: DefaultAccount[];
      }>("/api/accounting/setup");
      setIsSetupComplete(res.is_setup_complete);
      setAccountsCount(res.accounts_count);
      setDefaultAccounts(res.default_accounts ?? []);
    } catch {
      // If the API fails, proceed with setup
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSetupStatus(); }, [loadSetupStatus]);

  const handleSeedAccounts = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await accountingPost<{ status: string; accounts_created?: number }>("/api/accounting/setup", {
        currency,
      });

      if (res.status === "already_setup") {
        setMessage({ type: "success", text: "Chart of accounts already configured." });
        setIsSetupComplete(true);
      } else {
        setMessage({ type: "success", text: `Created ${res.accounts_created ?? 0} default accounts.` });
        setIsSetupComplete(true);
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to seed accounts." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Group default accounts by type for preview
  const groupedAccounts = ["asset", "liability", "equity", "revenue", "expense"].map((t) => ({
    type: t as AccountType,
    accounts: defaultAccounts.filter((a) => a.type === t),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/business/accounting")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">Accounting Setup</h1>
          <p className="app-subtitle text-sm">Configure your accounting module and chart of accounts</p>
        </div>
      </div>

      <StepDots current={step} total={2} />

      {/* Step 1: Organization Settings */}
      {step === 1 && (
        <div className="app-card space-y-5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700">Organization Settings</h2>

          <div>
            <label className="text-xs font-medium text-gray-600">Default Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="app-input mt-1 w-full"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              This will be the default currency for all accounting transactions.
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="app-primary-btn w-full"
          >
            Next — Chart of Accounts
          </button>
        </div>
      )}

      {/* Step 2: Default Chart of Accounts */}
      {step === 2 && (
        <div className="app-card space-y-5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700">Default Chart of Accounts</h2>
          <p className="text-xs text-gray-500">
            {isSetupComplete
              ? `You already have ${accountsCount} accounts configured. You can still add more from the Chart of Accounts page.`
              : "We'll create a standard chart of accounts for you. You can customize these later."
            }
          </p>

          {/* Preview of default accounts */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groupedAccounts.map((group) => (
              <div key={group.type}>
                <h3 className="mb-1 text-xs font-semibold capitalize text-gray-600">{group.type}</h3>
                <div className="space-y-1">
                  {group.accounts.map((account) => (
                    <div
                      key={account.code}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${TYPE_COLORS[group.type]}`}
                    >
                      <span className="font-mono font-semibold">{account.code}</span>
                      <span>{account.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {message && (
            <p className={`text-xs text-center ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="app-secondary-btn flex-1">
              Back
            </button>
            {isSetupComplete ? (
              <button
                onClick={() => router.push("/business/accounting/accounts")}
                className="app-primary-btn flex-1 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Go to Chart of Accounts
              </button>
            ) : (
              <button
                onClick={() => void handleSeedAccounts()}
                disabled={saving}
                className="app-primary-btn flex-1 disabled:opacity-50"
              >
                {saving ? "Creating accounts…" : "Create Default Accounts"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
