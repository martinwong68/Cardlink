import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type TransactionLineDraft = {
  account_id?: string;
  debit?: number;
  credit?: number;
  currency?: string;
  exchange_rate?: number;
  description?: string;
};

type TransactionDraft = {
  org_id?: string;
  date?: string;
  description?: string;
  reference_number?: string;
  status?: "draft" | "posted" | "voided";
  idempotency_key?: string;
  lines?: TransactionLineDraft[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data: txRows, error: txError } = await supabase
    .from("transactions")
    .select("id, org_id, date, description, reference_number, status, created_by, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const txIds = (txRows ?? []).map((row) => row.id);
  const { data: lineRows, error: lineError } = txIds.length
    ? await supabase
        .from("transaction_lines")
        .select("id, transaction_id, account_id, debit, credit, currency, exchange_rate, description")
        .in("transaction_id", txIds)
    : { data: [], error: null };

  if (lineError) {
    return NextResponse.json({ error: lineError.message }, { status: 500 });
  }

  const lineMap = new Map<string, unknown[]>();
  (lineRows ?? []).forEach((line) => {
    const list = lineMap.get(line.transaction_id) ?? [];
    list.push(line);
    lineMap.set(line.transaction_id, list);
  });

  return NextResponse.json({
    contract: "accounting.transactions.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    transactions: (txRows ?? []).map((tx) => ({ ...tx, lines: lineMap.get(tx.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as TransactionDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (lines.length < 2) {
    return NextResponse.json({ error: "At least 2 transaction lines are required." }, { status: 400 });
  }

  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of lines) {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
      return NextResponse.json(
        { error: "Each line must have exactly one side: debit or credit." },
        { status: 400 }
      );
    }
    if (!line.account_id) {
      return NextResponse.json({ error: "Each line requires account_id." }, { status: 400 });
    }
    debitTotal += debit;
    creditTotal += credit;
  }

  debitTotal = round2(debitTotal);
  creditTotal = round2(creditTotal);

  if (debitTotal <= 0 || creditTotal <= 0 || debitTotal !== creditTotal) {
    return NextResponse.json(
      { error: "Double-entry validation failed: total debit must equal total credit and be > 0." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const accountIds = Array.from(new Set(lines.map((line) => line.account_id as string)));
  const { data: accountRows, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("org_id", guard.context.organizationId)
    .in("id", accountIds)
    .eq("is_active", true);

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 });
  }

  if ((accountRows ?? []).length !== accountIds.length) {
    return NextResponse.json({ error: "One or more accounts are invalid or outside organization scope." }, { status: 403 });
  }

  const idempotencyKey = body.idempotency_key?.trim() || null;
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("org_id", guard.context.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        contract: "accounting.transactions.v1",
        status: "idempotent_replay",
        organization_id: guard.context.organizationId,
        transaction_id: existing.id,
      });
    }
  }

  const { data: txRow, error: txError } = await supabase
    .from("transactions")
    .insert({
      org_id: guard.context.organizationId,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      description: body.description?.trim() || null,
      reference_number: body.reference_number?.trim() || null,
      status: body.status ?? "posted",
      created_by: guard.context.userId,
      idempotency_key: idempotencyKey,
    })
    .select("id, date, reference_number, status")
    .single();

  if (txError || !txRow) {
    const conflict = txError?.code === "23505";
    return NextResponse.json({ error: txError?.message ?? "Transaction create failed." }, { status: conflict ? 409 : 400 });
  }

  const linePayload = lines.map((line) => ({
    transaction_id: txRow.id,
    account_id: line.account_id,
    debit: Number(line.debit ?? 0),
    credit: Number(line.credit ?? 0),
    currency: line.currency?.trim() || "USD",
    exchange_rate: Number(line.exchange_rate ?? 1),
    description: line.description?.trim() || null,
  }));

  const { error: lineInsertError } = await supabase.from("transaction_lines").insert(linePayload);

  if (lineInsertError) {
    await supabase.from("transactions").delete().eq("id", txRow.id);
    return NextResponse.json({ error: lineInsertError.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "transaction.posted",
    tableName: "transactions",
    recordId: txRow.id,
    newValues: {
      transaction: txRow,
      lines: linePayload,
      debit_total: debitTotal,
      credit_total: creditTotal,
    },
  });

  return NextResponse.json(
    {
      contract: "accounting.transactions.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      transaction_id: txRow.id,
      debit_total: debitTotal,
      credit_total: creditTotal,
      emitted_events: ["accounting.transaction.posted"],
    },
    { status: 201 }
  );
}
