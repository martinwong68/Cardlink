import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * GET /api/pos/member-offers
 * Returns active company_offers for the current company that a linked member can use.
 * These are the membership-level discounts/coupons redeemable with BOBO points.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("company_offers")
    .select("id, title, description, offer_type, discount_type, discount_value, points_cost, is_active, start_at, end_at, usage_limit, per_member_limit")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const activeOffers = (data ?? []).filter((o) => {
    if (o.start_at && o.start_at > now) return false;
    if (o.end_at && o.end_at < now) return false;
    return true;
  });

  return NextResponse.json({
    offers: activeOffers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      offer_type: o.offer_type,
      discount_type: o.discount_type,
      discount_value: Number(o.discount_value ?? 0),
      points_cost: o.points_cost ?? 0,
    })),
  });
}
