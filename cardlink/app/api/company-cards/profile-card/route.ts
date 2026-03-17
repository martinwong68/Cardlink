import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("id, name, description, profile_card_id")
    .eq("id", guard.context.activeCompanyId)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 400 });
  }

  if (!companyRow) {
    return NextResponse.json({ error: "Active company not found." }, { status: 404 });
  }

  if (companyRow.profile_card_id) {
    return NextResponse.json(
      {
        contract: "namecard.cards.v1",
        status: "exists",
        company_id: guard.context.activeCompanyId,
        card_id: companyRow.profile_card_id,
      },
      { status: 200 }
    );
  }

  const generatedSlug = `company-profile-${guard.context.activeCompanyId.slice(0, 8)}-${Date.now()
    .toString(36)
    .slice(-5)}`;

  const { data: createdCard, error: createError } = await supabase
    .from("business_cards")
    .insert({
      user_id: guard.context.user.id,
      company_id: guard.context.activeCompanyId,
      is_company_profile: true,
      card_name: "Company Profile",
      full_name: null,
      title: "Company Profile",
      company: companyRow.name,
      bio: companyRow.description ?? null,
      slug: generatedSlug,
      is_default: false,
      background_pattern: "gradient-1",
      background_color: "#6366f1",
    })
    .select("id, slug")
    .single();

  if (createError || !createdCard) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create profile card." },
      { status: 400 }
    );
  }

  const { error: companyUpdateError } = await supabase
    .from("companies")
    .update({
      profile_card_id: createdCard.id,
      profile_card_slug: createdCard.slug,
    })
    .eq("id", guard.context.activeCompanyId);

  if (companyUpdateError) {
    return NextResponse.json({ error: companyUpdateError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "namecard.cards.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      card_id: createdCard.id,
      emitted_events: ["namecard.card.created", "namecard.card.updated"],
    },
    { status: 201 }
  );
}
