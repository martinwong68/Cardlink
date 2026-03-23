import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type ReconciliationDraft = {
  org_id?: string;
  bank_account_id?: string;
  statement_date?: string;
  statement_balance?: number;
};

type MatchPayload = {
  org_id?: string;
  bank_transaction_id?: string;
  ledger_transaction_id?: string;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const bankAccountId = url.searchParams.get("bank_account_id");

  const supabase = await createClient();
  let query = supabase
    .from("bank_reconciliations")
    .select("id, bank_account_id, org_id, statement_date, statement_balance, ledger_balance, difference, status, matched_count, unmatched_count, reconciled_at, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("statement_date", { ascending: false })
    .limit(50);

  if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "accounting.bank_reconciliations.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    reconciliations: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReconciliationDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const bankAccountId = body.bank_account_id?.trim();
  const statementDate = body.statement_date;
  const statementBalance = Number(body.statement_balance ?? 0);

  if (!bankAccountId || !statementDate) {
    return NextResponse.json(
      { error: "bank_account_id and statement_date are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  /* Verify bank account */
  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("id, current_balance")
    .eq("id", bankAccountId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!bankAccount) return NextResponse.json({ error: "Bank account not found." }, { status: 404 });

  /* Count unreconciled transactions */
  const { count: unmatchedCount } = await supabase
    .from("bank_transactions")
    .select("id", { count: "exact", head: true })
    .eq("bank_account_id", bankAccountId)
    .eq("is_reconciled", false);

  const { count: matchedCount } = await supabase
    .from("bank_transactions")
    .select("id", { count: "exact", head: true })
    .eq("bank_account_id", bankAccountId)
    .eq("is_reconciled", true);

  const ledgerBalance = Number(bankAccount.current_balance);
  const difference = Math.round((statementBalance - ledgerBalance) * 100) / 100;

  const { data, error } = await supabase
    .from("bank_reconciliations")
    .insert({
      bank_account_id: bankAccountId,
      org_id: guard.context.organizationId,
      statement_date: statementDate,
      statement_balance: statementBalance,
      ledger_balance: ledgerBalance,
      difference,
      status: difference === 0 ? "completed" : "in_progress",
      matched_count: matchedCount ?? 0,
      unmatched_count: unmatchedCount ?? 0,
      reconciled_by: guard.context.userId,
      reconciled_at: difference === 0 ? new Date().toISOString() : null,
    })
    .select("id, status, difference")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Reconciliation create failed." }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bank_reconciliation.created",
    tableName: "bank_reconciliations",
    recordId: data.id,
    newValues: data,
  });

  return NextResponse.json(
    {
      contract: "accounting.bank_reconciliations.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      reconciliation_id: data.id,
      reconciliation_status: data.status,
      difference: data.difference,
      emitted_events: ["accounting.bank_reconciliation.created"],
    },
    { status: 201 }
  );
}

/* PATCH: Match a bank transaction to a ledger transaction */
export async function PATCH(request: Request) {
  const body = (await request.json()) as MatchPayload;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const bankTxnId = body.bank_transaction_id?.trim();
  const ledgerTxnId = body.ledger_transaction_id?.trim();

  if (!bankTxnId) {
    return NextResponse.json({ error: "bank_transaction_id is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      is_reconciled: true,
      matched_transaction_id: ledgerTxnId || null,
    })
    .eq("id", bankTxnId)
    .eq("org_id", guard.context.organizationId)
    .select("id, is_reconciled")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Match failed." }, { status: 400 });
  }

  return NextResponse.json({
    contract: "accounting.bank_reconciliations.v1",
    status: "matched",
    organization_id: guard.context.organizationId,
    bank_transaction_id: data.id,
    emitted_events: ["accounting.bank_transaction.matched"],
  });
}
