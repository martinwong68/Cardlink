import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BankAccountDraft = {
  org_id?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  currency?: string;
  ledger_account_id?: string;
  opening_balance?: number;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, org_id, account_name, account_number, bank_name, currency, ledger_account_id, opening_balance, current_balance, is_active, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("account_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "accounting.bank_accounts.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    bank_accounts: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BankAccountDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const accountName = body.account_name?.trim();
  if (!accountName) {
    return NextResponse.json({ error: "account_name is required." }, { status: 400 });
  }

  const openingBalance = Number(body.opening_balance ?? 0);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      org_id: guard.context.organizationId,
      account_name: accountName,
      account_number: body.account_number?.trim() || null,
      bank_name: body.bank_name?.trim() || null,
      currency: body.currency?.trim() || "USD",
      ledger_account_id: body.ledger_account_id?.trim() || null,
      opening_balance: openingBalance,
      current_balance: openingBalance,
    })
    .select("id, account_name, current_balance")
    .single();

  if (error || !data) {
    const conflict = error?.code === "23505";
    return NextResponse.json(
      { error: error?.message ?? "Bank account create failed." },
      { status: conflict ? 409 : 400 }
    );
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bank_account.created",
    tableName: "bank_accounts",
    recordId: data.id,
    newValues: data,
  });

  return NextResponse.json(
    {
      contract: "accounting.bank_accounts.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      bank_account_id: data.id,
      emitted_events: ["accounting.bank_account.created"],
    },
    { status: 201 }
  );
}
