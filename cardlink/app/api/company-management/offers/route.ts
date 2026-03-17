import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type OfferDraft = {
  company_id?: string;
  title?: string;
  description?: string | null;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  points_cost?: number | null;
  usage_limit?: number | null;
  per_member_limit?: number | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as OfferDraft;
  const expectedCompanyId = body.company_id?.trim();

  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId,
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
    .insert({
      company_id: guard.context.activeCompanyId,
      title,
      description: body.description?.trim() || null,
      offer_type: "discount",
      discount_type: body.discount_type ?? null,
      discount_value: body.discount_value ?? null,
      points_cost: body.points_cost ?? null,
      usage_limit: body.usage_limit ?? null,
      per_member_limit: body.per_member_limit ?? null,
      is_active: true,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "company.management.offers.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      offer_id: data.id,
      emitted_events: ["company.offer.created"],
    },
    { status: 201 }
  );
}
