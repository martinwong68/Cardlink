import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * GET /api/cron/ai-review
 *
 * Cron-compatible endpoint for scheduled AI business reviews.
 * Intended to be called by an external scheduler (e.g. Vercel Cron, GitHub Actions).
 *
 * Query parameters:
 *   ?type=daily|monthly|annual
 *   &secret=<CRON_SECRET>
 *
 * This endpoint processes all active companies that have AI access enabled.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get("secret");
  const reviewType = searchParams.get("type") ?? "daily";

  // Verify cron secret
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["daily", "monthly", "annual"].includes(reviewType)) {
    return NextResponse.json(
      { error: "type must be 'daily', 'monthly', or 'annual'" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Get all active companies with AI credits
  const { data: companies } = await supabase
    .from("ai_credits")
    .select("company_id")
    .gt("actions_remaining", 0);

  if (!companies || companies.length === 0) {
    return NextResponse.json({ status: "ok", message: "No companies to review", processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const { company_id } of companies) {
    try {
      // Store a review trigger record — actual AI processing happens
      // when the user views it or via background job
      await supabase.from("ai_business_reviews").insert({
        company_id,
        review_type: reviewType,
        status: "pending",
        triggered_by: "cron",
      });
      processed++;
    } catch (err) {
      errors.push(`${company_id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    status: "ok",
    processed,
    total: companies.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
