import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BankAccountDraft = {
  org_id?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  currency?: string;
  opening_balance?: number;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const isActiveParam = url.searchParams.get("is_active");

  const supabase = await createClient();
  let query = supabase
    .from("acct_bank_accounts")
    .select("id, org_id, bank_name, account_name, account_number, routing_number, currency, opening_balance, current_balance, is_active, created_at")
    .eq("org_id", guard.context.organizationId);

  if (isActiveParam === "true") query = query.eq("is_active", true);
  else if (isActiveParam === "false") query = query.eq("is_active", false);

  const { data, error } = await query.order("account_name");

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

  const bankName = body.bank_name?.trim();
  const accountName = body.account_name?.trim();
  if (!bankName || !accountName) {
    return NextResponse.json(
      { error: "bank_name and account_name are required." },
      { status: 400 },
    );
  }

  const openingBalance = Number(body.opening_balance ?? 0);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("acct_bank_accounts")
    .insert({
      org_id: guard.context.organizationId,
      bank_name: bankName,
      account_name: accountName,
      account_number: body.account_number?.trim() || null,
      routing_number: body.routing_number?.trim() || null,
      currency: body.currency?.trim() || "USD",
      opening_balance: openingBalance,
      current_balance: openingBalance,
    })
    .select("id, account_name, current_balance")
    .single();

  if (error || !data) {
    const conflict = error?.code === "23505";
    return NextResponse.json(
      { error: error?.message ?? "Bank account create failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bank_account.created",
    tableName: "acct_bank_accounts",
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
    { status: 201 },
  );
}
