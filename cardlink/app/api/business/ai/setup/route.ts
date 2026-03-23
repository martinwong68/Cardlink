import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { checkAiAccess, checkAiActionBalance } from "@/src/lib/plan-enforcement";
import { createClient } from "@/src/lib/supabase/server";
import { aiChat, type ChatMessage } from "@/src/lib/ai";
import { buildSetupAgentPrompt } from "@/src/lib/ai/agent-prompts";
import { prepareFileContent } from "@/src/lib/ai/data-transformer";

/**
 * POST /api/business/ai/setup
 *
 * Setup Agent endpoint.
 * Accepts either:
 *   - JSON body with { messages, fileContent, fileName } for text-based uploads
 *   - JSON body with { messages } for follow-up conversation
 *
 * The AI will recognise document patterns, transform data, and return
 * a preview for the user to confirm.
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
    fileContent?: string;
    fileName?: string;
  };

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // Fetch company info for context
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  // Build setup agent system prompt
  const systemPrompt = buildSetupAgentPrompt({
    companyName: company?.name ?? "Unknown",
    existingModules: ["accounting", "inventory", "pos", "crm", "hr", "booking", "procurement"],
  });

  // Build message list
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // If file content is provided, prepare it and inject as context
  if (body.fileContent && body.fileName) {
    const { context } = prepareFileContent(body.fileName, body.fileContent);
    messages.push({
      role: "user",
      content: `I'm uploading a business document for setup.\n\n${context}`,
    });
  }

  // Add conversation history
  messages.push(...body.messages);

  try {
    const response = await aiChat({
      messages,
      model: body.model,
    });

    // Increment usage counter
    await supabase.rpc("increment_ai_actions_used", { p_company_id: companyId });

    // Store the upload record if this was a file upload
    if (body.fileContent && body.fileName) {
      await supabase.from("ai_setup_uploads").insert({
        company_id: companyId,
        user_id: guard.context.user.id,
        file_name: body.fileName,
        file_size: body.fileContent.length,
        ai_response: response.content,
        status: "preview",
      });
    }

    return NextResponse.json({ content: response.content, meta: response.meta });
  } catch (err) {
    console.error("[AI Setup] Provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Please try again." },
      { status: 502 },
    );
  }
}
