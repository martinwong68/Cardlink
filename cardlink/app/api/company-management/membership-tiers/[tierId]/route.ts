import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type TierUpdatePayload = {
  required_spend_amount?: number;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tierId: string }> }
) {
  const { tierId } = await context.params;
  const body = (await request.json()) as TierUpdatePayload;

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const value = body.required_spend_amount;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return NextResponse.json(
      { error: "required_spend_amount must be a non-negative number." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: tierRow, error: tierError } = await supabase
    .from("membership_tiers")
    .select("id, program_id")
    .eq("id", tierId)
    .maybeSingle();

  if (tierError) {
    return NextResponse.json({ error: tierError.message }, { status: 400 });
  }

  if (!tierRow) {
    return NextResponse.json({ error: "Tier not found." }, { status: 404 });
  }

  const { data: programRow, error: programError } = await supabase
    .from("membership_programs")
    .select("id, company_id")
    .eq("id", tierRow.program_id)
    .maybeSingle();

  if (programError) {
    return NextResponse.json({ error: programError.message }, { status: 400 });
  }

  if (!programRow || programRow.company_id !== guard.context.activeCompanyId) {
    return NextResponse.json(
      { error: "Tier is outside your active company scope." },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from("membership_tiers")
    .update({ required_spend_amount: value })
    .eq("id", tierId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "company.management.membership_tiers.v1",
      status: "updated",
      company_id: guard.context.activeCompanyId,
      tier_id: tierId,
    },
    { status: 200 }
  );
}
