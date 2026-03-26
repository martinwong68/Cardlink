"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  BookOpen,
  Receipt,
  BarChart3,
  Landmark,
  Wallet,
  Users,
  FolderOpen,
  Settings,
} from "lucide-react";

import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";
import { accountingGet } from "@/src/lib/accounting/client";
import type { InvoiceRow, TransactionRow, AccountRow } from "@/src/lib/accounting/types";

/* ── Accounting function tile definitions ── */
const accountingFunctions: ModuleFunctionDefinition[] = [
  {
    id: "invoices",
    title: "Invoices",
    description: "Create, send, and track invoices for your clients",
    icon: FileText,
    color: "bg-green-50 text-green-600",
    ctaLabel: "Create Invoice",
    ctaHref: "/business/accounting/invoices/new",
  },
  {
    id: "transactions",
    title: "Journal Entries",
    description: "Record and manage double-entry journal transactions",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
    ctaLabel: "New Journal Entry",
    ctaHref: "/business/accounting/transactions/new",
  },
  {
    id: "accounts",
    title: "Chart of Accounts",
    description: "Manage your account structure and categories",
    icon: Landmark,
    color: "bg-indigo-50 text-indigo-600",
    ctaLabel: "View Accounts",
    ctaHref: "/business/accounting/accounts",
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Process employee payroll and view payment history",
    icon: Wallet,
    color: "bg-purple-50 text-purple-600",
    ctaLabel: "Run Payroll",
    ctaHref: "/business/accounting/payroll",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate profit & loss, balance sheet, and cash flow reports",
    icon: BarChart3,
    color: "bg-teal-50 text-teal-600",
    ctaLabel: "Generate Report",
    ctaHref: "/business/accounting/reports",
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Manage customers, vendors, and employee contacts",
    icon: Users,
    color: "bg-orange-50 text-orange-600",
    ctaLabel: "View Contacts",
    ctaHref: "/business/accounting/contacts",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Upload and organise receipts, bills, and attachments",
    icon: FolderOpen,
    color: "bg-amber-50 text-amber-600",
    ctaLabel: "Upload Document",
    ctaHref: "/business/accounting/documents",
  },
  {
    id: "expenses",
    title: "Expenses",
    description: "Track and categorise business expenses",
    icon: Receipt,
    color: "bg-red-50 text-red-600",
    ctaLabel: "Record Expense",
    ctaHref: "/business/accounting/transactions/new",
  },
];

/* ── Lightweight data for detail card summaries ── */
type SummaryData = {
  invoices: InvoiceRow[];
  transactions: TransactionRow[];
  accounts: AccountRow[];
};

function toAmount(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function AccountingLandingPage() {
  const [activeId, setActiveId] = useState<string>(accountingFunctions[0].id);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, txnRes, accRes] = await Promise.all([
          accountingGet<{ invoices: InvoiceRow[] }>("/api/accounting/invoices"),
          accountingGet<{ transactions: TransactionRow[] }>("/api/accounting/transactions"),
          accountingGet<{ accounts: AccountRow[] }>("/api/accounting/accounts"),
        ]);
        setData({
          invoices: invRes.invoices ?? [],
          transactions: txnRes.transactions ?? [],
          accounts: accRes.accounts ?? [],
        });
      } catch {
        // fail gracefully — detail cards will show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeFunc = useMemo(
    () => accountingFunctions.find((f) => f.id === activeId) ?? accountingFunctions[0],
    [activeId],
  );

  /* Badge text with real counts */
  const functionsWithBadges = useMemo(() => {
    if (!data) return accountingFunctions;
    return accountingFunctions.map((fn) => {
      if (fn.id === "invoices") {
        const overdue = data.invoices.filter((i) => i.status === "overdue").length;
        return overdue > 0 ? { ...fn, badgeText: `${overdue} overdue` } : fn;
      }
      if (fn.id === "transactions") {
        const draft = data.transactions.filter((t) => t.status === "draft").length;
        return draft > 0 ? { ...fn, badgeText: `${draft} draft` } : fn;
      }
      return fn;
    });
  }, [data]);

  const needsSetup = !loading && data && data.accounts.length === 0;

  return (
    <div className="space-y-4 pb-28">
      {/* Setup banner — shown when no accounts are configured */}
      {needsSetup && (
        <Link
          href="/business/accounting/setup"
          className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 transition hover:bg-indigo-100"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <Settings className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800">Complete Accounting Setup</p>
            <p className="text-xs text-indigo-600">
              Set up your default currency and chart of accounts to get started with accounting.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
            Setup
          </span>
        </Link>
      )}

      {/* Function slider */}
      <ModuleFunctionSlider
        items={functionsWithBadges}
        activeId={activeId}
        onSelect={setActiveId}
      />

      {/* Detail card for selected function */}
      <ModuleFunctionDetailCard
        title={activeFunc.title}
        description={activeFunc.description}
        ctaLabel={activeFunc.ctaLabel}
        ctaHref={activeFunc.ctaHref}
        loading={loading}
        empty={!loading && !detailHasContent(activeId, data)}
        emptyMessage={`No ${activeFunc.title.toLowerCase()} data yet`}
      >
        <DetailContent activeId={activeId} data={data} />
      </ModuleFunctionDetailCard>
    </div>
  );
}

/* ── Helper: does the active function have content to show? ── */
function detailHasContent(activeId: string, data: SummaryData | null): boolean {
  if (!data) return false;
  switch (activeId) {
    case "invoices": return data.invoices.length > 0;
    case "transactions": return data.transactions.length > 0;
    case "accounts": return data.accounts.length > 0;
    case "expenses": return data.transactions.length > 0;
    default: return false; // other tiles show empty-state which triggers the detail card's own content
  }
}

/* ── Detail content renderer per function ── */
function DetailContent({ activeId, data }: { activeId: string; data: SummaryData | null }) {
  if (!data) return null;

  switch (activeId) {
    case "invoices": {
      const recent = [...data.invoices]
        .sort((a, b) => (b.issue_date ?? "").localeCompare(a.issue_date ?? ""))
        .slice(0, 5);
      if (recent.length === 0) return null;
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent invoices</p>
          {recent.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{inv.invoice_number ?? "Draft"}</p>
                <p className="text-xs text-gray-500">{inv.due_date ?? "No due date"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{toAmount(Number(inv.total ?? 0))}</p>
                <span className={`app-pill px-2 py-0.5 text-[10px] uppercase ${inv.status === "overdue" ? "text-red-600 border-red-200 bg-red-50" : ""}`}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "transactions":
    case "expenses": {
      const recent = [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
      if (recent.length === 0) return null;
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent entries</p>
          {recent.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{entry.description ?? "Untitled"}</p>
                <p className="text-xs text-gray-500">{entry.reference_number ?? "No ref"} · {entry.date}</p>
              </div>
              <span className="app-pill px-2 py-0.5 text-[10px] uppercase">{entry.status}</span>
            </div>
          ))}
        </div>
      );
    }

    case "accounts": {
      const grouped = ["asset", "liability", "equity", "revenue", "expense"].map((type) => ({
        type,
        count: data.accounts.filter((a) => a.type === type).length,
      }));
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            {grouped.map((g) => (
              <div key={g.type} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500 capitalize">{g.type}</p>
                <p className="text-lg font-bold text-gray-900">{g.count}</p>
              </div>
            ))}
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-xs text-indigo-500">Total</p>
              <p className="text-lg font-bold text-indigo-700">{data.accounts.length}</p>
            </div>
          </div>
        </div>
      );
    }

    case "payroll":
      return (
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">Select to view payroll records and run payroll cycles</p>
        </div>
      );

    case "reports":
      return (
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">Generate P&L, Balance Sheet, Cash Flow, and Trial Balance reports</p>
        </div>
      );

    case "contacts":
      return (
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">Manage customers, vendors, and employee contact records</p>
        </div>
      );

    case "documents":
      return (
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">Upload receipts, bills, and file attachments for records</p>
        </div>
      );

    default:
      return null;
  }
}
