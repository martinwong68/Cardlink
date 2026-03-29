import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { checkAiAccess, checkAiActionBalance } from "@/src/lib/plan-enforcement";
import { createClient } from "@/src/lib/supabase/server";
import { aiChat } from "@/src/lib/ai";
import { buildDocumentProcessorPrompt } from "@/src/lib/ai/agent-prompts";
import { parseCSV, extractJSONFromResponse } from "@/src/lib/ai/data-transformer";
import type { DocumentProcessResult } from "@/src/lib/ai/data-transformer";

const MAX_TEXT_CONTENT_LENGTH = 15000;
const MAX_IMAGE_CONTENT_LENGTH = 20000;

/**
 * Extract text from a base64-encoded PDF using pdf-parse.
 * Returns the extracted text, or null if extraction fails.
 */
async function extractPdfText(base64Content: string): Promise<string | null> {
  try {
    // Import from lib sub-path to avoid the top-level require('fs') in pdf-parse/index.js
    // which causes Vercel/Turbopack bundling failures
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as
      (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(base64Content, "base64");
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process-document] PDF text extraction failed:", message);
    return null;
  }
}

/**
 * POST /api/business/ai/process-document
 *
 * Smart document processing endpoint.
 * Accepts a file's text content (or base64 for images) plus an optional
 * voice instruction and returns a structured action plan the user can
 * review and confirm before execution.
 *
 * Body: {
 *   fileContent: string,   // text content or base64 for images
 *   fileName: string,
 *   voiceInstruction?: string,
 *   model?: string,
 * }
 *
 * Response: {
 *   documentType: string,
 *   summary: string,
 *   steps: Array<{ label, module, operation, params }>
 * }
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
      {
        error: "AI features are not available on your current plan.",
        reason: access.reason,
      },
      { status: 403 },
    );
  }

  const balance = await checkAiActionBalance(supabase, companyId);
  if (!balance.allowed) {
    return NextResponse.json(
      {
        error: "AI usage limit reached.",
        reason: balance.reason,
        limit: balance.limit,
        used: balance.used,
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    fileContent: string;
    fileName: string;
    voiceInstruction?: string;
    model?: string;
  };

  if (!body.fileContent || !body.fileName) {
    return NextResponse.json(
      { error: "fileContent and fileName are required." },
      { status: 400 },
    );
  }

  // Fetch company info for prompt context
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  const companyName = company?.name ?? "Unknown";
  const enabledModules = [
    "accounting",
    "inventory",
    "pos",
    "crm",
    "hr",
    "procurement",
  ];

  // Build document content for the AI
  // Safely extract file extension (handles names with no extension or multiple dots)
  const lastDot = body.fileName.lastIndexOf(".");
  const ext = lastDot !== -1 ? body.fileName.slice(lastDot + 1).toLowerCase() : "";
  const isCSV = ["csv", "tsv"].includes(ext);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  const isPDF = ext === "pdf";

  let documentContent: string;

  if (isCSV) {
    // Pre-parse CSV deterministically and send structured data
    const rows = parseCSV(body.fileContent);
    documentContent = `FILE: ${body.fileName} (CSV, ${rows.length} rows)
HEADERS: ${rows.length > 0 ? Object.keys(rows[0]).join(", ") : "none"}
DATA (JSON):
${JSON.stringify(rows, null, 2)}`;
  } else if (isImage) {
    // For images, send base64 content for vision analysis
    documentContent = `FILE: ${body.fileName} (Image — base64 encoded)
[Image content provided as base64 for vision analysis]
${body.fileContent.slice(0, MAX_IMAGE_CONTENT_LENGTH)}`;
  } else if (isPDF) {
    // PDF content is now base64-encoded — extract text server-side
    const pdfText = await extractPdfText(body.fileContent);
    if (pdfText && pdfText.trim().length > 0) {
      documentContent = `FILE: ${body.fileName} (PDF — extracted text)
CONTENT:
${pdfText.slice(0, MAX_TEXT_CONTENT_LENGTH)}${pdfText.length > MAX_TEXT_CONTENT_LENGTH ? "\n... (truncated)" : ""}`;
    } else {
      // Fallback: send base64 for vision analysis if text extraction failed
      documentContent = `FILE: ${body.fileName} (PDF — could not extract text, base64 provided for vision)
[PDF content as base64]
${body.fileContent.slice(0, MAX_IMAGE_CONTENT_LENGTH)}`;
    }
  } else {
    // Plain text, JSON, XML, etc.
    documentContent = `FILE: ${body.fileName} (${ext ? ext.toUpperCase() : "TEXT"})
CONTENT:
${body.fileContent.slice(0, MAX_TEXT_CONTENT_LENGTH)}${body.fileContent.length > MAX_TEXT_CONTENT_LENGTH ? "\n... (truncated)" : ""}`;
  }

  const systemPrompt = buildDocumentProcessorPrompt({
    companyName,
    enabledModules,
    voiceInstruction: body.voiceInstruction,
  });

  try {
    const response = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please process this document:\n\n${documentContent}`,
        },
      ],
      model: body.model,
    });

    // Increment usage counter
    await supabase.rpc("increment_ai_actions_used", { p_company_id: companyId });

    // Parse structured JSON from AI response
    const result = extractJSONFromResponse<DocumentProcessResult>(
      response.content,
    );

    if (!result || !result.steps) {
      console.error("[process-document] AI response did not contain expected JSON structure for file:", body.fileName);
      return NextResponse.json(
        { error: "AI could not extract structured data from the document. Please try adding more detailed instructions." },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[process-document] Provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Please try again." },
      { status: 502 },
    );
  }
}
