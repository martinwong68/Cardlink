/**
 * Utilities for the Setup Agent's data transformation pipeline.
 *
 * Handles parsing uploaded file content (text-based) and structuring
 * it for AI pattern recognition.
 */

/* ── Types ── */

export type DocumentType =
  | "inventory_products"
  | "accounting_accounts"
  | "hr_employees"
  | "crm_contacts"
  | "company_profile"
  | "pos_products"
  | "sales_records"
  | "bank_statement"
  | "receipt"
  | "invoice"
  | "journal_entries"
  | "vendor_bill"
  | "other";

export type TargetModule =
  | "inventory"
  | "accounting"
  | "hr"
  | "crm"
  | "pos"
  | "company"
  | "other";

export type ParsedSetupData = {
  documentType: DocumentType;
  targetModule: TargetModule;
  summary: string;
  recordCount: number;
  fields: string[];
  preview: Record<string, unknown>[];
  fullData: Record<string, unknown>[];
};

export type ReviewType = "daily" | "monthly" | "annual";

export type ReviewReport = {
  reviewType: ReviewType;
  period: string;
  overallHealth: "good" | "warning" | "critical";
  score: number;
  sections: Array<{
    title: string;
    status: "ok" | "warning" | "critical";
    findings: string[];
    suggestions: string[];
  }>;
  topPriorities: string[];
  executiveSummary: string;
};

export type OperationStep = {
  module: string;
  operation: string;
  params: Record<string, unknown>;
};

export type DocumentActionStep = {
  label: string;
  module: string;
  operation: string;
  params: Record<string, unknown>;
};

export type DocumentProcessResult = {
  documentType: DocumentType;
  summary: string;
  steps: DocumentActionStep[];
};

export type ActionPlan = {
  intent: string;
  steps: OperationStep[];
};

/* ── CSV Parser ── */

/**
 * Parse CSV text into an array of objects.
 * Handles quoted fields and common delimiters (, ; \t).
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(";")
      ? ";"
      : ",";

  const headers = splitCSVLine(firstLine, delimiter).map((h) =>
    h.trim().replace(/^["']|["']$/g, ""),
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim().replace(/^["']|["']$/g, "");
    });
    rows.push(row);
  }

  return rows;
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/* ── Content preparation ── */

/**
 * Prepare uploaded file content for AI processing.
 * Extracts text and provides structural hints.
 */
export function prepareFileContent(
  fileName: string,
  textContent: string,
): { context: string; isCSV: boolean; parsedRows: Record<string, string>[] } {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const isCSV = ["csv", "tsv"].includes(ext);

  let parsedRows: Record<string, string>[] = [];
  let context = "";

  if (isCSV) {
    parsedRows = parseCSV(textContent);
    context = `FILE: ${fileName} (${ext.toUpperCase()}, ${parsedRows.length} rows detected)
HEADERS: ${parsedRows.length > 0 ? Object.keys(parsedRows[0]).join(", ") : "none"}
SAMPLE (first 3 rows):
${JSON.stringify(parsedRows.slice(0, 3), null, 2)}

FULL DATA:
${JSON.stringify(parsedRows, null, 2)}`;
  } else {
    context = `FILE: ${fileName} (${ext.toUpperCase()})
CONTENT:
${textContent.slice(0, 10000)}${textContent.length > 10000 ? "\n... (truncated)" : ""}`;
  }

  return { context, isCSV, parsedRows };
}

/* ── Extract JSON from AI response ── */

/**
 * Extract a JSON block from the AI response text.
 * Looks for ```json ... ``` or ```review-report ... ``` or ```action-plan ... ``` blocks.
 */
export function extractJSONFromResponse<T = unknown>(
  text: string,
  blockType?: string,
): T | null {
  // Try specific block type first, then generic json
  const patterns: string[] = blockType
    ? [
        "```" + blockType + "\\s*\\n([\\s\\S]*?)\\n\\s*```",
        "```json\\s*\\n([\\s\\S]*?)\\n\\s*```",
      ]
    : [
        "```json\\s*\\n([\\s\\S]*?)\\n\\s*```",
        "```\\s*\\n([\\s\\S]*?)\\n\\s*```",
      ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Fallback: try to parse the entire text as JSON
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    return null;
  }
}

/**
 * Extract action commands from AI response.
 * Looks for ```action ... ``` blocks.
 */
export function extractActionFromResponse(
  text: string,
): { action: string; [key: string]: unknown } | null {
  const regex = /```action\s*\n([\s\S]*?)\n\s*```/;
  const match = text.match(regex);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }
  return null;
}
