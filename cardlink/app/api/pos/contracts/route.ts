import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    contract: "pos.payment.v1",
    status: "scaffold",
    required_request_fields: [
      "company_id",
      "order_id",
      "amount",
      "currency",
      "idempotency_key",
      "operation_ts",
    ],
    webhook_dedup_key: "provider_event_id",
    states: [
      "created",
      "authorized",
      "captured",
      "failed",
      "refunded",
      "reconciliation_pending",
    ],
  });
}
