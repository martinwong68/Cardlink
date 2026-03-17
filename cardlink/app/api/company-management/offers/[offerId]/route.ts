import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type OfferUpdate = {
  company_id?: string;
  title?: string;
  description?: string | null;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  points_cost?: number | null;
  usage_limit?: number | null;
  per_member_limit?: number | null;
  is_active?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await context.params;
  const body = (await request.json()) as OfferUpdate;

  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId: body.company_id,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_offers")
    .update({
      title,
      description: body.description?.trim() || null,
      discount_type: body.discount_type ?? null,
      discount_value: body.discount_value ?? null,
      points_cost: body.points_cost ?? null,
      usage_limit: body.usage_limit ?? null,
      per_member_limit: body.per_member_limit ?? null,
      is_active: body.is_active ?? true,
    })
    .eq("id", offerId)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Offer not found in active company scope." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      contract: "company.management.offers.v1",
      status: "updated",
      company_id: guard.context.activeCompanyId,
      offer_id: data.id,
      emitted_events: ["company.offer.updated"],
    },
    { status: 200 }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await context.params;

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_offers")
    .delete()
    .eq("id", offerId)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Offer not found in active company scope." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      contract: "company.management.offers.v1",
      status: "deleted",
      company_id: guard.context.activeCompanyId,
      offer_id: data.id,
      emitted_events: ["company.offer.deleted"],
    },
    { status: 200 }
  );
}
