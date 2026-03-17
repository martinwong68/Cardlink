import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type RedemptionDecisionPayload = {
  approve?: boolean;
  reason?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ redemptionId: string }> }
) {
  const { redemptionId } = await context.params;
  const body = (await request.json()) as RedemptionDecisionPayload;

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  if (typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "approve is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: redemptionRow, error: redemptionError } = await supabase
    .from("offer_redemptions")
    .select("id, offer_id")
    .eq("id", redemptionId)
    .maybeSingle();

  if (redemptionError) {
    return NextResponse.json({ error: redemptionError.message }, { status: 400 });
  }

  if (!redemptionRow) {
    return NextResponse.json({ error: "Redemption not found." }, { status: 404 });
  }

  const { data: offerRow, error: offerError } = await supabase
    .from("company_offers")
    .select("id, company_id")
    .eq("id", redemptionRow.offer_id)
    .maybeSingle();

  if (offerError) {
    return NextResponse.json({ error: offerError.message }, { status: 400 });
  }

  if (!offerRow || offerRow.company_id !== guard.context.activeCompanyId) {
    return NextResponse.json(
      { error: "Redemption is outside your active company scope." },
      { status: 403 }
    );
  }

  const { error: rpcError } = await supabase.rpc("company_confirm_redemption", {
    p_redemption_id: redemptionId,
    p_approve: body.approve,
    p_reason: body.approve ? null : (body.reason?.trim() || "Rejected by company manager."),
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "company.management.redemptions.v1",
      status: "updated",
      company_id: guard.context.activeCompanyId,
      redemption_id: redemptionId,
      decision: body.approve ? "approved" : "rejected",
      emitted_events: [
        body.approve ? "company.redemption.approved" : "company.redemption.rejected",
      ],
    },
    { status: 200 }
  );
}
