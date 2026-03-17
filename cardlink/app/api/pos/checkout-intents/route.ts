import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type CheckoutIntentDraft = {
  company_id?: string;
  companyId?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  idempotency_key?: string;
  operation_id?: string;
  correlation_id?: string;
  occurred_at?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutIntentDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  if (
    !body.order_id ||
    typeof body.amount !== "number" ||
    !body.currency ||
    !body.idempotency_key
  ) {
    return NextResponse.json(
      {
        error:
          "order_id, amount, currency, and idempotency_key are required.",
      },
      { status: 400 }
    );
  }

  if (body.amount <= 0) {
    return NextResponse.json({ error: "amount must be positive." }, { status: 400 });
  }

  const operationId = body.operation_id?.trim() || crypto.randomUUID();
  const correlationId = body.correlation_id?.trim() || body.order_id.trim();
  const occurredAt = body.occurred_at?.trim() || new Date().toISOString();

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("pos_payment_operations")
    .select("id, operation_id, state")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("idempotency_key", body.idempotency_key.trim())
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      {
        contract: "pos.checkout_intents.v1",
        status: "idempotent_replay",
        company_id: guard.context.activeCompanyId,
        checkout_intent_id: existing.id,
        operation_id: existing.operation_id,
        state: existing.state,
      },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("pos_payment_operations")
    .insert({
      company_id: guard.context.activeCompanyId,
      order_id: body.order_id.trim(),
      amount: body.amount,
      currency: body.currency.trim().toUpperCase(),
      state: "created",
      operation_id: operationId,
      correlation_id: correlationId,
      idempotency_key: body.idempotency_key.trim(),
      occurred_at: occurredAt,
      created_by: guard.context.user.id,
    })
    .select("id, operation_id, state")
    .single();

  if (error || !data) {
    const conflict = error?.code === "23505";
    return NextResponse.json({ error: error?.message ?? "Failed to persist checkout intent." }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json(
    {
      contract: "pos.checkout_intents.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      checkout_intent_id: data.id,
      operation_id: data.operation_id,
      state: data.state,
    },
    { status: 201 }
  );
}
