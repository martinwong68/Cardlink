import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { checkAiAccess, checkAiActionBalance } from "@/src/lib/plan-enforcement";
import { createClient } from "@/src/lib/supabase/server";
import { aiChat, type ChatMessage } from "@/src/lib/ai";
import { buildOpsAgentPrompt } from "@/src/lib/ai/agent-prompts";
import { assembleAiContext } from "@/src/lib/ai-context";

/**
 * POST /api/business/ai/operations
 *
 * Operations Agent endpoint.
 * Accepts a natural-language prompt and returns an action plan.
 * The user must confirm before execution.
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // Plan checks
  const access = await checkAiAccess(supabase, companyId);
  if (!access.allowed) {
    return NextResponse.json(
      { error: "AI features are not available on your current plan.", reason: access.reason },
      { status: 403 },
    );
  }

  const balance = await checkAiActionBalance(supabase, companyId);
  if (!balance.allowed) {
    return NextResponse.json(
      { error: "AI usage limit reached.", reason: balance.reason, limit: balance.limit, used: balance.used },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    messages: ChatMessage[];
    model?: string;
  };

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // Fetch company info
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  // Get business context
  const businessContext = await assembleAiContext(companyId);

  // Build operations agent system prompt
  const systemPrompt = buildOpsAgentPrompt({
    companyName: company?.name ?? "Unknown",
    enabledModules: ["accounting", "inventory", "pos", "crm", "hr", "booking", "procurement"],
    businessContext,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...body.messages,
  ];

  try {
    const response = await aiChat({
      messages,
      model: body.model,
    });

    // Increment usage counter
    await supabase.rpc("increment_ai_actions_used", { p_company_id: companyId });

    return NextResponse.json({ content: response.content, meta: response.meta });
  } catch (err) {
    console.error("[AI Operations] Provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Please try again." },
      { status: 502 },
    );
  }
}
