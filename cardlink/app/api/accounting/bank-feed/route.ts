import { NextResponse } from "next/server";

import { requireAccountingContext } from "@/src/lib/accounting/context";

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  return NextResponse.json({
    contract: "accounting.bank_feed.v1",
    status: "placeholder",
    organization_id: guard.context.organizationId,
    provider: "not_connected",
    next_action: "Attach external bank API connector in next batch.",
    emitted_events: ["accounting.bank_feed.placeholder.read"],
  });
}
