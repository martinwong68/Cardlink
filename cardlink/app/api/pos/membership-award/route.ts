import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type AwardRequestBody = {
  account_id?: string;
  order_id?: string;
  amount?: number;
  points?: number;
  occurred_at?: string;
};
const ORDER_ID_ALLOWED_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

async function rollbackMembershipAwardWrites(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  companyId: string;
  ledgerId?: string;
  spendId?: string;
}) {
  const { supabase, companyId, ledgerId, spendId } = params;
  const rollbackErrors: string[] = [];

  if (spendId) {
    const { error: rollbackSpendError } = await supabase
      .from("membership_spend_transactions")
      .delete()
      .eq("id", spendId)
      .eq("company_id", companyId);
    if (rollbackSpendError) rollbackErrors.push(rollbackSpendError.message);
    if (rollbackSpendError) {
      console.error("[pos-membership-award] rollback spend transaction failed:", rollbackSpendError.message);
    }
  }

  if (ledgerId) {
    const { error: rollbackLedgerError } = await supabase
      .from("membership_points_ledger")
      .delete()
      .eq("id", ledgerId)
      .eq("company_id", companyId);
    if (rollbackLedgerError) rollbackErrors.push(rollbackLedgerError.message);
    if (rollbackLedgerError) {
      console.error("[pos-membership-award] rollback points ledger failed:", rollbackLedgerError.message);
    }
  }

  return rollbackErrors;
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as AwardRequestBody;
  const accountId = body.account_id?.trim();
  const orderId = body.order_id?.trim();
  const amount = Number(body.amount ?? NaN);
  const points = Number(body.points ?? NaN);
  const occurredAtInput = body.occurred_at?.trim();

  if (!accountId || !orderId || !Number.isFinite(amount) || !Number.isFinite(points)) {
    return NextResponse.json(
      { error: "account_id, order_id, amount, and points are required." },
      { status: 400 }
    );
  }

  if (amount < 0 || points < 0) {
    return NextResponse.json(
      { error: "amount and points must be non-negative." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(points)) {
    return NextResponse.json({ error: "points must be an integer." }, { status: 400 });
  }
  if (!orderId || !ORDER_ID_ALLOWED_REGEX.test(orderId)) {
    return NextResponse.json({ error: "order_id must be 1-64 chars: letters, numbers, _ or -." }, { status: 400 });
  }

  const occurredAt = occurredAtInput || new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return NextResponse.json({ error: "occurred_at must be a valid ISO datetime." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data: account, error: accountError } = await supabase
    .from("membership_accounts")
    .select("id, user_id, points_balance, lifetime_points, total_spend_amount")
    .eq("id", accountId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json({ error: "Membership account not found for active company." }, { status: 404 });
  }

  const currentPointsBalance = Number(account.points_balance ?? 0);
  const currentLifetimePoints = Number(account.lifetime_points ?? 0);
  const currentTotalSpend = Number(account.total_spend_amount ?? 0);
  const newPointsBalance = currentPointsBalance + points;
  const newLifetimePoints = currentLifetimePoints + points;
  const newTotalSpend = currentTotalSpend + amount;
  const ledgerNote = `POS order ${orderId} awarded ${points} points`;
  const spendNote = `POS order ${orderId} spend`;

  const { data: ledgerRow, error: ledgerError } = await supabase
    .from("membership_points_ledger")
    .insert({
      company_id: companyId,
      account_id: accountId,
      event_type: "earn",
      points_delta: points,
      balance_after: newPointsBalance,
      reference_type: "pos_order",
      reference_id: orderId,
      note: ledgerNote,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  const { data: spendRow, error: spendError } = await supabase
    .from("membership_spend_transactions")
    .insert({
      company_id: companyId,
      account_id: accountId,
      user_id: account.user_id,
      amount,
      reference_type: "pos_order",
      reference_id: orderId,
      note: spendNote,
      created_by: guard.context.user.id,
      occurred_at: occurredAt,
    })
    .select("id")
    .single();

  if (spendError) {
    const rollbackErrors = await rollbackMembershipAwardWrites({
      supabase,
      companyId,
      ledgerId: ledgerRow?.id,
    });
    return NextResponse.json(
      {
        error: spendError.message,
        rollback_errors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
      },
      { status: 500 }
    );
  }

  const { data: updatedAccounts, error: updateError } = await supabase
    .from("membership_accounts")
    .update({
      points_balance: newPointsBalance,
      lifetime_points: newLifetimePoints,
      total_spend_amount: newTotalSpend,
    })
    .eq("id", accountId)
    .eq("company_id", companyId)
    .eq("points_balance", currentPointsBalance)
    .eq("lifetime_points", currentLifetimePoints)
    .select("id");

  if (updateError) {
    const rollbackErrors = await rollbackMembershipAwardWrites({
      supabase,
      companyId,
      ledgerId: ledgerRow?.id,
      spendId: spendRow?.id,
    });
    return NextResponse.json(
      {
        error: updateError.message,
        rollback_errors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
      },
      { status: 500 }
    );
  }
  if (!updatedAccounts || updatedAccounts.length === 0) {
    const rollbackErrors = await rollbackMembershipAwardWrites({
      supabase,
      companyId,
      ledgerId: ledgerRow?.id,
      spendId: spendRow?.id,
    });
    return NextResponse.json(
      {
        error: "Membership account was modified concurrently. Please retry.",
        rollback_errors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, points_awarded: points });
}
