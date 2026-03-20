import { createClient } from "@/src/lib/supabase/client";

type FeedbackSummary = {
  totalCards: number;
  approvedCount: number;
  rejectedCount: number;
  amendedCount: number;
  approvalRate: number;
  topRejectionReasons: Array<{ reason: string; count: number }>;
};

/**
 * Fetch feedback summary for a company to inject into AI context.
 */
export async function getFeedbackSummary(
  companyId: string
): Promise<FeedbackSummary> {
  const supabase = createClient();

  const { count: totalCards } = await supabase
    .from("ai_card_feedback")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: approvedCount } = await supabase
    .from("ai_card_feedback")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("feedback_type", "approved");

  const { count: rejectedCount } = await supabase
    .from("ai_card_feedback")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("feedback_type", "rejected");

  const { count: amendedCount } = await supabase
    .from("ai_card_feedback")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("feedback_type", "amended");

  const total = totalCards ?? 0;
  const approved = approvedCount ?? 0;
  const rejected = rejectedCount ?? 0;
  const amended = amendedCount ?? 0;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Get top rejection reasons
  const { data: rejections } = await supabase
    .from("ai_card_feedback")
    .select("rejection_reason")
    .eq("company_id", companyId)
    .eq("feedback_type", "rejected")
    .not("rejection_reason", "is", null)
    .limit(100);

  const reasonCounts = new Map<string, number>();
  for (const row of rejections ?? []) {
    const reason = (row.rejection_reason as string) ?? "Unknown";
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }

  const topRejectionReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }));

  return {
    totalCards: total,
    approvedCount: approved,
    rejectedCount: rejected,
    amendedCount: amended,
    approvalRate,
    topRejectionReasons,
  };
}

/**
 * Assemble AI context string including business feedback data.
 */
export async function assembleAiContext(companyId: string): Promise<string> {
  const feedback = await getFeedbackSummary(companyId);

  const avoidPatterns = feedback.topRejectionReasons
    .map((r) => `"${r.reason}" (${r.count}x)`)
    .join(", ");

  return `AI LEARNING CONTEXT:
- Card approval rate: ${feedback.approvalRate}%
- Total cards: ${feedback.approvedCount} approved, ${feedback.rejectedCount} rejected, ${feedback.amendedCount} amended
- Common rejection reasons: ${avoidPatterns || "None yet"}
- AVOID: suggesting patterns similar to rejected cards${
    feedback.topRejectionReasons.length > 0
      ? ` — specifically: ${avoidPatterns}`
      : ""
  }`;
}
