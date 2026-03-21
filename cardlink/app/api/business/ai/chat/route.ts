import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { checkAiAccess, checkAiActionBalance } from "@/src/lib/plan-enforcement";
import { createClient } from "@/src/lib/supabase/server";
import { aiChat, type ChatMessage } from "@/src/lib/ai";
import { assembleAiContext } from "@/src/lib/ai-context";

type ChatBody = {
  messages: ChatMessage[];
  model?: string;
  /** If provided, injects business context into the system prompt. */
  includeBusinessContext?: boolean;
};

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

  const body = (await request.json()) as ChatBody;
  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // Optionally inject business learning context
  const messages = [...body.messages];
  if (body.includeBusinessContext) {
    const ctx = await assembleAiContext(companyId);
    messages.unshift({ role: "system", content: ctx });
  }

  try {
    const response = await aiChat({
      messages,
      model: body.model,
    });

    // Increment usage counter
    await supabase.rpc("increment_ai_actions_used", { p_company_id: companyId });

    return NextResponse.json({ content: response.content, meta: response.meta });
  } catch (err) {
    console.error("[AI Chat] Provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Please try again." },
      { status: 502 },
    );
  }
}
