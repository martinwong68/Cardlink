import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type CardCreatePayload = {
  companyId?: string;
  targetUserId?: string;
  cardName?: string;
  fullName?: string;
  title?: string;
  company?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const body = (await request.json()) as CardCreatePayload;
  const expectedCompanyId = body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: memberRow } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("user_id", targetUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!memberRow) {
    return NextResponse.json(
      { error: "Target user is not an active member of the active company." },
      { status: 403 }
    );
  }

  const baseName = body.fullName?.trim() || body.cardName?.trim() || "Company Card";
  const slug = `${slugify(baseName) || "company-card"}-${Date.now().toString(36).slice(-5)}`;

  const { data, error } = await supabase
    .from("business_cards")
    .insert({
      user_id: targetUserId,
      company_id: guard.context.activeCompanyId,
      card_name: body.cardName?.trim() || "Company Card",
      full_name: body.fullName?.trim() || null,
      title: body.title?.trim() || null,
      company: body.company?.trim() || null,
      slug,
      is_default: false,
      background_pattern: "gradient-1",
      background_color: "#6366f1",
      template: "classic-business",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "namecard.cards.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      card_id: data.id,
      emitted_events: ["namecard.card.created"],
    },
    { status: 201 }
  );
}
