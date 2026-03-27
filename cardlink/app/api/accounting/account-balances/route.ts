import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

/**
 * GET /api/accounting/account-balances
 * Returns all accounts with their computed balance (sum of debits - sum of credits).
 *
 * Optional query param: ?account_id=<uuid>
 * When provided, also returns the individual transaction lines for that account.
 */
export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const orgId = guard.context.organizationId;
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");

  // 1. Fetch all accounts
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, org_id, code, name, type, parent_id, is_active, created_at")
    .eq("org_id", orgId)
    .order("code", { ascending: true });

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  // 2. Fetch all transaction_lines for this org's transactions (only posted)
  const { data: txRows } = await supabase
    .from("transactions")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "posted");

  const txIds = (txRows ?? []).map((t) => t.id);

  let allLines: { account_id: string; debit: number; credit: number }[] = [];
  if (txIds.length > 0) {
    // Supabase .in() has a limit, batch if needed
    const batchSize = 200;
    for (let i = 0; i < txIds.length; i += batchSize) {
      const batch = txIds.slice(i, i + batchSize);
      const { data: lines } = await supabase
        .from("transaction_lines")
        .select("account_id, debit, credit")
        .in("transaction_id", batch);
      if (lines) allLines = allLines.concat(lines);
    }
  }

  // 3. Aggregate balances per account
  const balanceMap = new Map<string, { debit: number; credit: number }>();
  for (const line of allLines) {
    const existing = balanceMap.get(line.account_id) ?? { debit: 0, credit: 0 };
    existing.debit += Number(line.debit) || 0;
    existing.credit += Number(line.credit) || 0;
    balanceMap.set(line.account_id, existing);
  }

  const accountsWithBalance = (accounts ?? []).map((acc) => {
    const agg = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
    // For asset/expense: balance = debit - credit (debit-normal)
    // For liability/equity/revenue: balance = credit - debit (credit-normal)
    const isDebitNormal = acc.type === "asset" || acc.type === "expense";
    const balance = isDebitNormal
      ? agg.debit - agg.credit
      : agg.credit - agg.debit;
    return {
      ...acc,
      total_debit: Math.round(agg.debit * 100) / 100,
      total_credit: Math.round(agg.credit * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  });

  // 4. If a specific account_id is requested, also return its transaction lines
  let accountLines: unknown[] = [];
  if (accountId && txIds.length > 0) {
    const batchSize = 200;
    let rawLines: {
      id: string;
      transaction_id: string;
      debit: number;
      credit: number;
      currency: string;
      description: string | null;
      created_at: string;
    }[] = [];
    for (let i = 0; i < txIds.length; i += batchSize) {
      const batch = txIds.slice(i, i + batchSize);
      const { data: lines } = await supabase
        .from("transaction_lines")
        .select("id, transaction_id, debit, credit, currency, description, created_at")
        .eq("account_id", accountId)
        .in("transaction_id", batch)
        .order("created_at", { ascending: false });
      if (lines) rawLines = rawLines.concat(lines);
    }

    // Enrich with transaction date and reference
    const relevantTxIds = Array.from(new Set(rawLines.map((l) => l.transaction_id)));
    let txMap = new Map<string, { date: string; description: string | null; reference_number: string | null; status: string }>();
    if (relevantTxIds.length > 0) {
      for (let i = 0; i < relevantTxIds.length; i += batchSize) {
        const batch = relevantTxIds.slice(i, i + batchSize);
        const { data: txData } = await supabase
          .from("transactions")
          .select("id, date, description, reference_number, status")
          .in("id", batch);
        if (txData) {
          for (const tx of txData) txMap.set(tx.id, tx);
        }
      }
    }

    accountLines = rawLines
      .map((line) => {
        const tx = txMap.get(line.transaction_id);
        return {
          id: line.id,
          transaction_id: line.transaction_id,
          date: tx?.date ?? null,
          reference_number: tx?.reference_number ?? null,
          tx_description: tx?.description ?? null,
          line_description: line.description,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          currency: line.currency,
          created_at: line.created_at,
        };
      })
      .sort((a, b) => {
        const da = a.date ?? a.created_at;
        const db = b.date ?? b.created_at;
        return db.localeCompare(da);
      });
  }

  return NextResponse.json({
    contract: "accounting.account-balances.v1",
    status: "ok",
    organization_id: orgId,
    accounts: accountsWithBalance,
    ...(accountId ? { account_id: accountId, lines: accountLines } : {}),
  });
}
