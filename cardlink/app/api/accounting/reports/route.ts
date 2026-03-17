import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type ReportType = "trial-balance" | "profit-loss" | "balance-sheet" | "cash-flow";

function signedAmountByType(type: string, debit: number, credit: number): number {
  if (type === "asset" || type === "expense") {
    return debit - credit;
  }
  return credit - debit;
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

  if (!["trial-balance", "profit-loss", "balance-sheet", "cash-flow"].includes(reportType)) {
    return NextResponse.json({ error: "Unsupported report type." }, { status: 400 });
  }

  const supabase = await createClient();
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
