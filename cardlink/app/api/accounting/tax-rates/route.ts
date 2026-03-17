import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type TaxRateDraft = {
  org_id?: string;
  name?: string;
  rate?: number;
  region?: string;
  is_default?: boolean;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .select("id, org_id, name, rate, region, is_default, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.tax_rates.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    tax_rates: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as TaxRateDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  const rate = Number(body.rate ?? -1);
  if (!name || rate < 0 || rate > 100) {
    return NextResponse.json({ error: "name and rate(0..100) are required." }, { status: 400 });
  }

  const supabase = await createClient();
  if (body.is_default) {
    await supabase
      .from("tax_rates")
      .update({ is_default: false })
      .eq("org_id", guard.context.organizationId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("tax_rates")
    .insert({
      org_id: guard.context.organizationId,
      name,
      rate,
      region: body.region?.trim() || null,
      is_default: body.is_default ?? false,
    })
    .select("id, name, rate, region, is_default")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "accounting.tax_rates.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      tax_rate: data,
      emitted_events: ["accounting.tax_rate.created"],
    },
    { status: 201 }
  );
}
