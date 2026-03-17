import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type PaymentState = "created" | "authorized" | "captured" | "failed" | "refunded";

type PaymentWebhookDraft = {
  company_id?: string;
  companyId?: string;
  provider?: string;
  provider_event_id?: string;
  event_type?: string;
  operation_id?: string;
  correlation_id?: string;
  idempotency_key?: string;
  target_state?: PaymentState;
  occurred_at?: string;
  payload?: Record<string, unknown>;
};

function resolveNextState(body: PaymentWebhookDraft): PaymentState | null {
  if (body.target_state) {
    return body.target_state;
  }

  const eventType = body.event_type?.toLowerCase() ?? "";
  if (eventType.includes("authorized")) return "authorized";
  if (eventType.includes("captured") || eventType.includes("succeeded")) return "captured";
  if (eventType.includes("failed") || eventType.includes("declined")) return "failed";
  if (eventType.includes("refunded")) return "refunded";
  return null;
}

function isValidTransition(currentState: PaymentState, nextState: PaymentState) {
  if (currentState === nextState) {
    return true;
  }

  const allowed: Record<PaymentState, PaymentState[]> = {
    created: ["authorized", "failed"],
    authorized: ["captured", "failed"],
    captured: ["refunded"],
    failed: [],
    refunded: [],
  };

  return allowed[currentState].includes(nextState);
}

export async function POST(request: Request) {
  const body = (await request.json()) as PaymentWebhookDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  if (!body.provider || !body.provider_event_id || !body.event_type) {
    return NextResponse.json(
      { error: "provider, provider_event_id, and event_type are required." },
      { status: 400 }
    );
  }

  const nextState = resolveNextState(body);
  if (!nextState) {
    return NextResponse.json({ error: "target payment state cannot be resolved." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existingEvent, error: eventLookupError } = await supabase
    .from("pos_payment_webhook_events")
    .select("id, company_id")
    .eq("provider", body.provider)
    .eq("provider_event_id", body.provider_event_id)
    .maybeSingle();

  if (eventLookupError) {
    return NextResponse.json({ error: eventLookupError.message }, { status: 500 });
  }

  if (existingEvent) {
    return NextResponse.json(
      {
        contract: "pos.payment_webhook.v1",
        status: "duplicate",
        company_id: existingEvent.company_id,
        webhook_event_id: existingEvent.id,
      },
      { status: 200 }
    );
  }

  let operationQuery = supabase
    .from("pos_payment_operations")
    .select("id, company_id, state, operation_id, correlation_id, idempotency_key")
    .eq("company_id", guard.context.activeCompanyId);

  if (body.operation_id?.trim()) {
    operationQuery = operationQuery.eq("operation_id", body.operation_id.trim());
  } else if (body.idempotency_key?.trim()) {
    operationQuery = operationQuery.eq("idempotency_key", body.idempotency_key.trim());
  } else {
    return NextResponse.json(
      { error: "operation_id or idempotency_key is required for webhook correlation." },
      { status: 400 }
    );
  }

  const { data: operationRow, error: operationError } = await operationQuery.maybeSingle();
  if (operationError) {
    return NextResponse.json({ error: operationError.message }, { status: 500 });
  }

  if (!operationRow) {
    return NextResponse.json({ error: "payment operation not found in active company scope." }, { status: 404 });
  }

  const currentState = operationRow.state as PaymentState;
  if (!isValidTransition(currentState, nextState)) {
    return NextResponse.json(
      {
        error: `Invalid payment transition from ${currentState} to ${nextState}.`,
      },
      { status: 409 }
    );
  }

  const occurredAt = body.occurred_at?.trim() || new Date().toISOString();
  const correlationId = body.correlation_id?.trim() || operationRow.correlation_id || null;
  const idempotencyKey = body.idempotency_key?.trim() || operationRow.idempotency_key;

  const { error: updateError } = await supabase
    .from("pos_payment_operations")
    .update({
      state: nextState,
      provider: body.provider,
      provider_event_id: body.provider_event_id,
      occurred_at: occurredAt,
      correlation_id: correlationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operationRow.id)
    .eq("company_id", guard.context.activeCompanyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: webhookRow, error: insertWebhookError } = await supabase
    .from("pos_payment_webhook_events")
    .insert({
      company_id: guard.context.activeCompanyId,
      provider: body.provider,
      provider_event_id: body.provider_event_id,
      event_type: body.event_type,
      operation_id: operationRow.operation_id,
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
      occurred_at: occurredAt,
      payload: body.payload ?? {},
    })
    .select("id")
    .single();

  if (insertWebhookError || !webhookRow) {
    const isDup = insertWebhookError?.code === "23505";
    return NextResponse.json(
      { error: insertWebhookError?.message ?? "failed to persist webhook event." },
      { status: isDup ? 200 : 500 }
    );
  }

  return NextResponse.json({
    contract: "pos.payment_webhook.v1",
    status: "processed",
    company_id: guard.context.activeCompanyId,
    webhook_event_id: webhookRow.id,
    checkout_intent_id: operationRow.id,
    operation_id: operationRow.operation_id,
    state: nextState,
  });
}
