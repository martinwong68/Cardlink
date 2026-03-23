import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type ReportType = "trial-balance" | "profit-loss" | "balance-sheet" | "cash-flow" | "ar-aging" | "ap-aging" | "general-ledger";

function signedAmountByType(type: string, debit: number, credit: number): number {
  if (type === "asset" || type === "expense") {
    return debit - credit;
  }
  return credit - debit;
}

function computeAgingBuckets(items: Array<{ due_date: string; balance_due: number }>, today: Date) {
  const buckets = [
    { range: "Current", amount: 0, count: 0 },
    { range: "1-30 days", amount: 0, count: 0 },
    { range: "31-60 days", amount: 0, count: 0 },
    { range: "61-90 days", amount: 0, count: 0 },
    { range: "91-120 days", amount: 0, count: 0 },
    { range: "120+ days", amount: 0, count: 0 },
  ];

  for (const item of items) {
    const dueDate = new Date(item.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(item.balance_due) || 0;

    if (balance <= 0) continue;

    if (daysOverdue <= 0) {
      buckets[0].amount += balance;
      buckets[0].count += 1;
    } else if (daysOverdue <= 30) {
      buckets[1].amount += balance;
      buckets[1].count += 1;
    } else if (daysOverdue <= 60) {
      buckets[2].amount += balance;
      buckets[2].count += 1;
    } else if (daysOverdue <= 90) {
      buckets[3].amount += balance;
      buckets[3].count += 1;
    } else if (daysOverdue <= 120) {
      buckets[4].amount += balance;
      buckets[4].count += 1;
    } else {
      buckets[5].amount += balance;
      buckets[5].count += 1;
    }
  }

  return buckets.map((b) => ({ ...b, amount: Math.round(b.amount * 100) / 100 }));
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const reportType = (url.searchParams.get("type") ?? "trial-balance") as ReportType;
  const startDate = url.searchParams.get("start") ?? "1900-01-01";
  const endDate = url.searchParams.get("end") ?? "2999-12-31";

  const validTypes = ["trial-balance", "profit-loss", "balance-sheet", "cash-flow", "ar-aging", "ap-aging", "general-ledger"];
  if (!validTypes.includes(reportType)) {
    return NextResponse.json({ error: "Unsupported report type." }, { status: 400 });
  }

  const supabase = await createClient();

  /* ── AR Aging Report ── */
  if (reportType === "ar-aging") {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_name, due_date, total, amount_paid, balance_due, status, currency")
      .eq("org_id", guard.context.organizationId)
      .not("status", "in", '("paid","voided")')
      .order("due_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = (invoices ?? []).map((inv) => ({
      ...inv,
      balance_due: Number(inv.balance_due) || (Number(inv.total) - Number(inv.amount_paid)),
    }));

    const buckets = computeAgingBuckets(
      items.map((i) => ({ due_date: i.due_date, balance_due: i.balance_due })),
      new Date()
    );

    const totalOutstanding = items.reduce((sum, i) => sum + i.balance_due, 0);

    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "ar-aging",
      organization_id: guard.context.organizationId,
      as_of_date: new Date().toISOString().slice(0, 10),
      summary: {
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        invoice_count: items.length,
        buckets,
      },
      rows: items,
      exportable_formats: ["pdf", "csv"],
    });
  }

  /* ── AP Aging Report ── */
  if (reportType === "ap-aging") {
    const { data: bills, error } = await supabase
      .from("vendor_bills")
      .select("id, bill_number, vendor_name, due_date, total, amount_paid, balance_due, status, currency")
      .eq("org_id", guard.context.organizationId)
      .not("status", "in", '("paid","voided")')
      .order("due_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = (bills ?? []).map((bill) => ({
      ...bill,
      balance_due: Number(bill.balance_due) || (Number(bill.total) - Number(bill.amount_paid)),
    }));

    const buckets = computeAgingBuckets(
      items.map((i) => ({ due_date: i.due_date, balance_due: i.balance_due })),
      new Date()
    );

    const totalOutstanding = items.reduce((sum, i) => sum + i.balance_due, 0);

    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "ap-aging",
      organization_id: guard.context.organizationId,
      as_of_date: new Date().toISOString().slice(0, 10),
      summary: {
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        bill_count: items.length,
        buckets,
      },
      rows: items,
      exportable_formats: ["pdf", "csv"],
    });
  }

  /* ── General Ledger Detail Report ── */
  if (reportType === "general-ledger") {
    const accountId = url.searchParams.get("account_id");

    const { data: lineRows, error } = await supabase
      .from("transaction_lines")
      .select("id, debit, credit, currency, exchange_rate, description, account_id, transaction_id, transactions!inner(org_id, date, description, reference_number, status), accounts!inner(code, name, type)")
      .eq("transactions.org_id", guard.context.organizationId)
      .eq("transactions.status", "posted")
      .gte("transactions.date", startDate)
      .lte("transactions.date", endDate)
      .order("transactions(date)", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let filteredRows = lineRows ?? [];
    if (accountId) {
      filteredRows = filteredRows.filter((r) => r.account_id === accountId);
    }

    let runningBalance = 0;
    const detailRows = filteredRows.map((line) => {
      const tx = Array.isArray(line.transactions) ? line.transactions[0] : line.transactions;
      const account = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts;
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      runningBalance += signedAmountByType(account?.type ?? "asset", debit, credit);

      return {
        date: tx?.date,
        reference: tx?.reference_number,
        transaction_description: tx?.description,
        line_description: line.description,
        account_code: account?.code,
        account_name: account?.name,
        debit,
        credit,
        running_balance: Math.round(runningBalance * 100) / 100,
      };
    });

    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "general-ledger",
      organization_id: guard.context.organizationId,
      start_date: startDate,
      end_date: endDate,
      account_filter: accountId ?? "all",
      rows: detailRows,
      exportable_formats: ["pdf", "csv"],
    });
  }

  /* ── Standard GL-based reports ── */
  const { data: lineRows, error } = await supabase
    .from("transaction_lines")
    .select("id, debit, credit, currency, exchange_rate, account_id, transactions!inner(org_id, date), accounts!inner(code, name, type)")
    .eq("transactions.org_id", guard.context.organizationId)
    .gte("transactions.date", startDate)
    .lte("transactions.date", endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byAccount = new Map<string, {
    account_id: string;
    code: string;
    name: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
  }>();

  for (const line of lineRows ?? []) {
    const account = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts;
    if (!account) {
      continue;
    }

    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    const current = byAccount.get(line.account_id) ?? {
      account_id: line.account_id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: 0,
      credit: 0,
      balance: 0,
    };

    current.debit += debit;
    current.credit += credit;
    current.balance = signedAmountByType(account.type, current.debit, current.credit);
    byAccount.set(line.account_id, current);
  }

  const rows = Array.from(byAccount.values()).sort((a, b) => a.code.localeCompare(b.code));

  if (reportType === "trial-balance") {
    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "trial-balance",
      organization_id: guard.context.organizationId,
      start_date: startDate,
      end_date: endDate,
      totals: {
        debit: rows.reduce((sum, row) => sum + row.debit, 0),
        credit: rows.reduce((sum, row) => sum + row.credit, 0),
      },
      rows,
    });
  }

  if (reportType === "profit-loss") {
    const revenue = rows
      .filter((row) => row.type === "revenue")
      .reduce((sum, row) => sum + row.balance, 0);
    const expenses = rows
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + row.balance, 0);

    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "profit-loss",
      organization_id: guard.context.organizationId,
      start_date: startDate,
      end_date: endDate,
      summary: {
        revenue,
        expenses,
        net_income: revenue - expenses,
      },
      rows: rows.filter((row) => row.type === "revenue" || row.type === "expense"),
      exportable_formats: ["pdf", "excel"],
    });
  }

  if (reportType === "balance-sheet") {
    const assets = rows
      .filter((row) => row.type === "asset")
      .reduce((sum, row) => sum + row.balance, 0);
    const liabilities = rows
      .filter((row) => row.type === "liability")
      .reduce((sum, row) => sum + row.balance, 0);
    const equity = rows
      .filter((row) => row.type === "equity")
      .reduce((sum, row) => sum + row.balance, 0);

    return NextResponse.json({
      contract: "accounting.reports.v1",
      status: "ok",
      report: "balance-sheet",
      organization_id: guard.context.organizationId,
      start_date: startDate,
      end_date: endDate,
      summary: {
        assets,
        liabilities,
        equity,
        balance_check: assets - (liabilities + equity),
      },
      rows: rows.filter((row) => ["asset", "liability", "equity"].includes(row.type)),
      exportable_formats: ["pdf", "excel"],
    });
  }

  const cashRows = rows.filter((row) => row.type === "asset" && row.code.startsWith("1"));
  const netCashChange = cashRows.reduce((sum, row) => sum + row.balance, 0);

  return NextResponse.json({
    contract: "accounting.reports.v1",
    status: "ok",
    report: "cash-flow",
    organization_id: guard.context.organizationId,
    start_date: startDate,
    end_date: endDate,
    summary: {
      net_cash_change: netCashChange,
      assumption: "Cash-flow is estimated from asset accounts with code prefix 1xx in this stage.",
    },
    rows: cashRows,
    exportable_formats: ["pdf", "excel"],
  });
}
