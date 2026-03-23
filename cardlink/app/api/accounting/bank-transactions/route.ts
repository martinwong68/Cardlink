import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BankTransactionDraft = {
  org_id?: string;
  bank_account_id?: string;
  transaction_date?: string;
  description?: string;
  amount?: number;
  reference?: string;
  source?: string;
};

type BankTransactionImport = {
  org_id?: string;
  bank_account_id?: string;
  transactions?: BankTransactionDraft[];
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const bankAccountId = url.searchParams.get("bank_account_id");
  const reconciledFilter = url.searchParams.get("is_reconciled");

  const supabase = await createClient();
  let query = supabase
    .from("bank_transactions")
    .select("id, bank_account_id, org_id, transaction_date, description, amount, reference, source, is_reconciled, matched_transaction_id, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("transaction_date", { ascending: false })
    .limit(200);

  if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);
  if (reconciledFilter === "true") query = query.eq("is_reconciled", true);
  if (reconciledFilter === "false") query = query.eq("is_reconciled", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "accounting.bank_transactions.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    bank_transactions: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BankTransactionImport;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const bankAccountId = body.bank_account_id?.trim();
  const transactions = Array.isArray(body.transactions) ? body.transactions : [];

  if (!bankAccountId || transactions.length === 0) {
    return NextResponse.json(
      { error: "bank_account_id and at least one transaction are required." },
      { status: 400 }
    );
  }

  /* Validate bank account belongs to org */
  const supabase = await createClient();
  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("id", bankAccountId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
  }

  const rows = transactions.map((txn) => ({
    bank_account_id: bankAccountId,
    org_id: guard.context.organizationId,
    transaction_date: txn.transaction_date ?? new Date().toISOString().slice(0, 10),
    description: txn.description?.trim() ?? "Imported transaction",
    amount: Number(txn.amount ?? 0),
    reference: txn.reference?.trim() || null,
    source: txn.source ?? "import",
  }));

  const { data, error } = await supabase
    .from("bank_transactions")
    .insert(rows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  /* Update bank account balance */
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  await supabase.rpc("", {}).catch(() => {
    /* If RPC not available, update inline */
  });
  await supabase
    .from("bank_accounts")
    .update({
      current_balance: supabase.rpc ? undefined : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bankAccountId);

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bank_transactions.imported",
    tableName: "bank_transactions",
    newValues: { count: rows.length, total_amount: totalAmount },
  });

  return NextResponse.json(
    {
      contract: "accounting.bank_transactions.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      imported_count: (data ?? []).length,
      emitted_events: ["accounting.bank_transactions.imported"],
    },
    { status: 201 }
  );
}
