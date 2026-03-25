import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/pos/apply-redemption
 * Verifies and confirms an offer_redemption, then returns the discount details
 * for the POS terminal to apply.
 *
 * Body: { redemption_id: string }
 *
 * Flow:
 *  1. Fetch the redemption from offer_redemptions
 *  2. Verify it belongs to this company's offer
 *  3. Verify status is "pending"
 *  4. Confirm the redemption (mark as used)
 *  5. Return the discount info from the linked company_offer
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const redemptionId = typeof body.redemption_id === "string" ? body.redemption_id.trim() : "";

  if (!redemptionId || !UUID_REGEX.test(redemptionId)) {
    return NextResponse.json({ error: "Valid redemption_id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // 1. Fetch the redemption
  const { data: redemption, error: redemptionError } = await supabase
    .from("offer_redemptions")
    .select("id, offer_id, account_id, user_id, status, points_spent, redeemed_at")
    .eq("id", redemptionId)
    .maybeSingle();

  if (redemptionError) {
    return NextResponse.json({ error: redemptionError.message }, { status: 500 });
  }
  if (!redemption) {
    return NextResponse.json({ error: "Redemption not found." }, { status: 404 });
  }

  // 2. Fetch the linked offer and verify company ownership
  const { data: offer, error: offerError } = await supabase
    .from("company_offers")
    .select("id, company_id, title, discount_type, discount_value, points_cost")
    .eq("id", redemption.offer_id)
    .maybeSingle();

  if (offerError) {
    return NextResponse.json({ error: offerError.message }, { status: 500 });
  }
  if (!offer) {
    return NextResponse.json({ error: "Linked offer not found." }, { status: 404 });
  }
  if (offer.company_id !== companyId) {
    return NextResponse.json({ error: "This redemption does not belong to your company." }, { status: 403 });
  }

  // 3. Check redemption status
  if (redemption.status !== "pending") {
    return NextResponse.json({
      error: `Redemption already ${redemption.status}.`,
      status: redemption.status,
      offer: {
        title: offer.title,
        discount_type: offer.discount_type,
        discount_value: Number(offer.discount_value ?? 0),
      },
    }, { status: 409 });
  }

  // 4. Confirm the redemption using the RPC if available, or direct update
  const { error: confirmError } = await supabase.rpc("company_confirm_redemption", {
    p_redemption_id: redemption.id,
    p_approve: true,
    p_reason: "Applied at POS terminal",
  });

  if (confirmError) {
    // Fallback: try direct update
    const { data: updateData, error: updateError } = await supabase
      .from("offer_redemptions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", redemption.id)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ error: "Redemption was already processed or modified." }, { status: 409 });
    }
  }

  // 5. Return the discount information
  return NextResponse.json({
    success: true,
    redemption_id: redemption.id,
    offer: {
      id: offer.id,
      title: offer.title,
      discount_type: offer.discount_type,
      discount_value: Number(offer.discount_value ?? 0),
      points_cost: offer.points_cost,
    },
    member_user_id: redemption.user_id,
    points_spent: redemption.points_spent,
  });
}
