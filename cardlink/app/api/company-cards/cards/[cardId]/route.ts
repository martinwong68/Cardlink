import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await context.params;

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data: cardRow, error: cardError } = await supabase
    .from("business_cards")
    .select("id, company_id")
    .eq("id", cardId)
    .maybeSingle();

  if (cardError) {
    return NextResponse.json({ error: cardError.message }, { status: 400 });
  }

  if (!cardRow || cardRow.company_id !== guard.context.activeCompanyId) {
    return NextResponse.json(
      { error: "Card is outside your active company scope." },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase
    .from("business_cards")
    .delete()
    .eq("id", cardId)
    .eq("company_id", guard.context.activeCompanyId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "namecard.cards.v1",
      status: "deleted",
      company_id: guard.context.activeCompanyId,
      card_id: cardId,
      emitted_events: ["namecard.card.updated"],
    },
    { status: 200 }
  );
}
