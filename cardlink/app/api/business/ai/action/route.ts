import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type ActionBody = {
  cardId: string;
  action: "approve" | "reject" | "amend";
  reason?: string;
  rejectionReason?: string;
  amendedData?: Record<string, unknown>;
  /** Bulk approve / reject */
  cardIds?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as ActionBody;

  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const userId = guard.context.user.id;
  const companyId = guard.context.activeCompanyId;
  const now = new Date().toISOString();

  /* ── Bulk action ── */
  if (body.cardIds && body.cardIds.length > 0) {
    if (body.action === "approve") {
      const { error } = await supabase
        .from("ai_action_cards")
        .update({ status: "approved", approved_by: userId, approved_at: now })
        .in("id", body.cardIds)
        .eq("company_id", companyId)
        .eq("status", "pending");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Insert feedback rows
      const feedbackRows = body.cardIds.map((id) => ({
        card_id: id,
        company_id: companyId,
        feedback_type: "approved" as const,
      }));
      await supabase.from("ai_card_feedback").insert(feedbackRows);

      return NextResponse.json({ status: "ok", updated: body.cardIds.length });
    }

    if (body.action === "reject") {
      const reason = body.reason ?? body.rejectionReason ?? "Bulk dismissed";
      const { error } = await supabase
        .from("ai_action_cards")
        .update({ status: "rejected", feedback_note: reason, approved_by: userId, approved_at: now })
        .in("id", body.cardIds)
        .eq("company_id", companyId)
        .eq("status", "pending");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const feedbackRows = body.cardIds.map((id) => ({
        card_id: id,
        company_id: companyId,
        feedback_type: "rejected" as const,
        rejection_reason: reason,
      }));
      await supabase.from("ai_card_feedback").insert(feedbackRows);

      return NextResponse.json({ status: "ok", updated: body.cardIds.length });
    }
  }

  /* ── Single card action ── */
  const cardId = body.cardId;
  if (!cardId) {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }

  // Verify card belongs to this company
  const { data: card } = await supabase
    .from("ai_action_cards")
    .select("id, company_id, status, suggested_data")
    .eq("id", cardId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  if (body.action === "approve") {
    const { error } = await supabase
      .from("ai_action_cards")
      .update({ status: "approved", approved_by: userId, approved_at: now })
      .eq("id", cardId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("ai_card_feedback").insert({
      card_id: cardId,
      company_id: companyId,
      feedback_type: "approved",
    });

    return NextResponse.json({ status: "ok" });
  }

  if (body.action === "reject") {
    const reason = body.reason ?? body.rejectionReason ?? null;
    const { error } = await supabase
      .from("ai_action_cards")
      .update({ status: "rejected", feedback_note: reason, approved_by: userId, approved_at: now })
      .eq("id", cardId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("ai_card_feedback").insert({
      card_id: cardId,
      company_id: companyId,
      feedback_type: "rejected",
      rejection_reason: reason,
    });

    return NextResponse.json({ status: "ok" });
  }

  if (body.action === "amend") {
    const amendedData = body.amendedData ?? {};
    const amendmentDiff = {
      original: card.suggested_data,
      amended: amendedData,
    };

    const { error } = await supabase
      .from("ai_action_cards")
      .update({
        status: "amended",
        amended_data: amendedData,
        approved_by: userId,
        approved_at: now,
      })
      .eq("id", cardId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("ai_card_feedback").insert({
      card_id: cardId,
      company_id: companyId,
      feedback_type: "amended",
      amendment_diff: amendmentDiff,
    });

    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
