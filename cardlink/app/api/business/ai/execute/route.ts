import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * POST /api/business/ai/execute
 *
 * Executes confirmed action steps from an AI preset card.
 * This runs the actions directly without re-asking the AI.
 *
 * Each step specifies a module, operation, and params.
 *
 * Uses service-role (admin) client to bypass RLS and avoid PostgREST
 * schema-cache issues that caused "0 actions completed" errors.
 *
 * Pre-validation:
 * - Ensures dependent records (organization, accounts) exist before inserting.
 * - Validates data (amounts, string lengths) to prevent DB overflow.
 */

type ActionStep = {
  label: string;
  module: string;
  operation: string;
  params: Record<string, unknown>;
};

type ExecuteBody = {
  steps: ActionStep[];
  answers?: Record<string, string>;
  conversationId?: string;
};

type StepResult = {
  step: number;
  label: string;
  success: boolean;
  error?: string;
};

/* ── Data validation limits ── */
const MAX_AMOUNT = 999_999_999_999.99;
const MAX_TEXT_LENGTH = 2000;
const MAX_STEPS_PER_REQUEST = 20;
const MAX_JOURNAL_ENTRY_LINES = 50;

const VALID_ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

function sanitizeText(value: unknown, maxLen = MAX_TEXT_LENGTH): string {
  const s = String(value ?? "");
  return s.slice(0, maxLen);
}

function sanitizeAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_AMOUNT);
}

/** Escape special characters for PostgreSQL ilike patterns */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/* ── Pre-flight helpers ── */

/**
 * Ensure the `organizations` row exists for a company.
 * The accounting module uses organizations.id = companies.id (1:1 overlay).
 * Without this row, inserts into transactions/invoices with org_id FK will fail.
 */
async function ensureOrgExists(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<void> {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();

  if (!org) {
    // Fetch company name to populate the organization record
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const { error } = await supabase.from("organizations").insert({
      id: companyId,
      name: company?.name ?? "My Business",
      currency: "USD",
    });
    // Ignore duplicate key errors (race condition safe)
    if (error && !error.message.includes("duplicate key")) {
      throw new Error(`Failed to initialise accounting organisation: ${error.message}`);
    }
  }
}

/**
 * Find an account for the given name/category and type, or create one if missing.
 * Returns the account id.
 */
async function ensureAccount(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  category: string,
  accountType: AccountType = "expense",
): Promise<string> {
  const prefix = accountType.slice(0, 3).toUpperCase(); // EXP, REV, ASS, LIA, EQU
  const normalised = sanitizeText(category, 100).toLowerCase().replace(/[^a-z0-9 _-]/g, "");
  const slug = normalised.replace(/\s+/g, "-").slice(0, 20) || "general";
  const accountCode = `${prefix}-${slug}`;
  const accountName = category.slice(0, 100) || `General ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`;

  // Try to find existing account by code
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", accountCode)
    .maybeSingle();

  if (existing) return existing.id as string;

  // Create the expense account
  const { data: created, error } = await supabase
    .from("accounts")
    .insert({
      org_id: orgId,
      code: accountCode,
      name: accountName,
      type: accountType,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    // If duplicate key, another request created it — fetch it
    if (error.message.includes("duplicate key")) {
      const { data: retry } = await supabase
        .from("accounts")
        .select("id")
        .eq("org_id", orgId)
        .eq("code", accountCode)
        .single();
      if (retry) return retry.id as string;
    }
    throw new Error(`Failed to create expense account "${accountName}": ${error.message}`);
  }
  return created.id as string;
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;

  const body = (await request.json()) as ExecuteBody;

  if (!body.steps || body.steps.length === 0) {
    return NextResponse.json({ error: "No steps to execute." }, { status: 400 });
  }

  if (body.steps.length > MAX_STEPS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many steps (max ${MAX_STEPS_PER_REQUEST}).` },
      { status: 400 },
    );
  }

  const results: StepResult[] = [];

  for (let i = 0; i < body.steps.length; i++) {
    const step = body.steps[i];
    try {
      await executeStep(supabase, companyId, userId, step, body.answers);
      results.push({ step: i + 1, label: step.label, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ step: i + 1, label: step.label, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const allSuccess = successCount === results.length;

  // Store the execution as an action card for history
  const { error: historyError } = await supabase.from("ai_action_cards").insert({
    company_id: companyId,
    card_type: "general",
    title: sanitizeText(`Executed ${results.length} action(s)`, 200),
    description: sanitizeText(
      results.map((r) => `${r.success ? "✓" : "✗"} ${r.label}`).join("\n"),
    ),
    suggested_data: { steps: body.steps, answers: body.answers, results },
    status: allSuccess ? "approved" : "pending",
    source_module: body.steps[0]?.module ?? "ai",
    approved_by: allSuccess ? userId : null,
    approved_at: allSuccess ? new Date().toISOString() : null,
  });

  // If history insert failed, log but don't block the response
  if (historyError) {
    console.error("[ai/execute] Failed to store action card:", historyError.message);
  }

  return NextResponse.json({
    success: allSuccess,
    results,
    message: allSuccess
      ? `All ${results.length} action(s) completed successfully.`
      : `${successCount}/${results.length} action(s) completed.`,
  });
}

/* ── Step executor ── */
async function executeStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  userId: string,
  step: ActionStep,
  answers?: Record<string, string>,
) {
  const params = { ...step.params };

  // Merge any answers into the params where placeholders exist
  if (answers) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
        const qId = value.slice(2, -2);
        if (answers[qId]) {
          params[key] = answers[qId];
        }
      }
    }
  }

  switch (step.module) {
    case "accounting":
      return executeAccountingStep(supabase, companyId, userId, step.operation, params);
    case "inventory":
      return executeInventoryStep(supabase, companyId, step.operation, params);
    case "crm":
      return executeCrmStep(supabase, companyId, step.operation, params);
    case "pos":
      return executePosStep(supabase, companyId, step.operation, params);
    default:
      return executeGenericStep(supabase, companyId, step.operation, params);
  }
}

/* ── Module-specific executors ── */

async function executeAccountingStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  userId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  // All accounting operations require the organizations row to exist
  await ensureOrgExists(supabase, companyId);

  switch (operation) {
    case "record_expense": {
      const amount = sanitizeAmount(params.amount);
      if (amount <= 0) throw new Error("Expense amount must be greater than zero.");

      const description = sanitizeText(params.description);
      if (!description) throw new Error("Expense description is required.");

      const category = sanitizeText(params.category || "general", 100);
      const date = params.date
        ? String(params.date).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Ensure the expense account exists for this category
      const accountId = await ensureAccount(supabase, companyId, category, "expense");

      // Insert the transaction with org_id (accounting schema FK)
      const { data: txn, error: txnError } = await supabase
        .from("transactions")
        .insert({
          org_id: companyId,
          description,
          date,
          reference_number: sanitizeText(params.reference_number, 100) || null,
          status: "posted",
          created_by: userId,
        })
        .select("id")
        .single();
      if (txnError) throw new Error(txnError.message);

      // Create the transaction line linking to the expense account
      const { error: lineError } = await supabase
        .from("transaction_lines")
        .insert({
          transaction_id: txn.id,
          account_id: accountId,
          debit: amount,
          credit: 0,
          description,
        });
      if (lineError) throw new Error(lineError.message);

      return;
    }
    case "create_invoice": {
      const amount = sanitizeAmount(params.amount ?? params.total);
      if (amount <= 0) throw new Error("Invoice amount must be greater than zero.");

      const clientName = sanitizeText(params.customer_name ?? params.customer ?? params.client_name, 200);
      if (!clientName) throw new Error("Customer / client name is required for an invoice.");

      const { error } = await supabase.from("invoices").insert({
        org_id: companyId,
        client_name: clientName,
        client_email: sanitizeText(params.client_email ?? params.email, 200) || null,
        total: amount,
        due_date: params.due_date ? String(params.due_date).slice(0, 10) : null,
        status: "draft",
        notes: sanitizeText(params.notes, 500) || null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "create_journal_entry": {
      const description = sanitizeText(params.description || "AI-generated journal entry");
      const date = params.date
        ? String(params.date).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Create the parent transaction
      const { data: txn, error: txnError } = await supabase
        .from("transactions")
        .insert({
          org_id: companyId,
          description,
          date,
          status: "posted",
          created_by: userId,
        })
        .select("id")
        .single();
      if (txnError) throw new Error(txnError.message);

      // Insert transaction lines if provided
      const entries = Array.isArray(params.entries) ? params.entries : [];
      if (entries.length > 0) {
        const lines = [];
        for (const entry of entries.slice(0, MAX_JOURNAL_ENTRY_LINES)) {
          const e = entry as { account?: string; debit?: number; credit?: number; type?: string };
          const accountName = sanitizeText(e.account, 100);
          if (!accountName) continue;

          // Determine account type from the entry or default to expense
          const entryType: AccountType = (VALID_ACCOUNT_TYPES as readonly string[]).includes(e.type ?? "")
            ? (e.type as AccountType)
            : "expense";

          const accountId = await ensureAccount(supabase, companyId, accountName, entryType);
          lines.push({
            transaction_id: txn.id,
            account_id: accountId,
            debit: sanitizeAmount(e.debit),
            credit: sanitizeAmount(e.credit),
            description: accountName,
          });
        }
        if (lines.length > 0) {
          const { error: lineError } = await supabase.from("transaction_lines").insert(lines);
          if (lineError) throw new Error(lineError.message);
        }
      }
      return;
    }
    case "record_payment": {
      const amount = sanitizeAmount(params.amount);
      if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

      const { error } = await supabase.from("payments").insert({
        org_id: companyId,
        amount,
        payment_date: params.date
          ? String(params.date).slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        payment_method: sanitizeText(params.payment_method || "cash", 50),
        reference: sanitizeText(params.reference, 200) || null,
        notes: sanitizeText(params.notes, 500) || null,
        related_type: sanitizeText(params.related_type, 50) || null,
        related_id: params.related_id ? String(params.related_id) : null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported accounting operation: ${operation}`);
  }
}

async function executeInventoryStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "check_stock": {
      // Read-only — no mutation. Just validate we can find the product.
      const searchName = sanitizeText(params.product ?? params.product_name, 200);
      const { data, error } = await supabase
        .from("inventory_products")
        .select("id, name, stock_quantity")
        .eq("company_id", companyId)
        .ilike("name", `%${searchName}%`)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Product not found: ${searchName}`);
      return;
    }
    case "adjust_stock": {
      const productName = sanitizeText(params.product ?? params.product_name, 200);
      if (!productName) throw new Error("Product name is required for stock adjustment.");

      const { data: product, error: findError } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", `%${productName}%`)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!product) throw new Error(`Product not found: ${productName}`);

      const qty = sanitizeAmount(params.quantity ?? params.stock_quantity);
      const { error } = await supabase
        .from("inventory_products")
        .update({ stock_quantity: qty })
        .eq("id", product.id);
      if (error) throw new Error(error.message);
      return;
    }
    case "add_product": {
      const name = sanitizeText(params.name ?? params.product_name, 200);
      if (!name) throw new Error("Product name is required.");

      // Check if product already exists (exact match, case insensitive)
      const { data: existing } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", escapeIlikePattern(name))
        .limit(1)
        .maybeSingle();
      if (existing) throw new Error(`Product "${name}" already exists.`);

      const { error } = await supabase.from("inventory_products").insert({
        company_id: companyId,
        name,
        sku: sanitizeText(params.sku, 100) || null,
        stock_quantity: sanitizeAmount(params.quantity ?? params.stock_quantity),
        price: sanitizeAmount(params.price ?? params.unit_price),
        description: sanitizeText(params.description, 500) || null,
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported inventory operation: ${operation}`);
  }
}

async function executeCrmStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "add_lead": {
      const name = sanitizeText(params.name ?? params.lead_name, 200);
      if (!name) throw new Error("Lead name is required.");

      const { error } = await supabase.from("crm_leads").insert({
        company_id: companyId,
        name,
        email: sanitizeText(params.email, 200) || null,
        phone: sanitizeText(params.phone, 50) || null,
        source: sanitizeText(params.source || "ai", 50),
        status: sanitizeText(params.status || "new", 50),
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "add_contact": {
      const name = sanitizeText(params.name, 200);
      if (!name) throw new Error("Contact name is required.");

      const { error } = await supabase.from("crm_contacts").insert({
        company_id: companyId,
        name,
        email: sanitizeText(params.email, 200) || null,
        phone: sanitizeText(params.phone, 50) || null,
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported CRM operation: ${operation}`);
  }
}

async function executePosStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "record_sale": {
      const total = sanitizeAmount(params.amount ?? params.total);
      if (total <= 0) throw new Error("Sale total must be greater than zero.");

      const { error } = await supabase.from("pos_orders").insert({
        company_id: companyId,
        total,
        items: Array.isArray(params.items) ? params.items.slice(0, 100) : [],
        status: "completed",
        payment_method: sanitizeText(params.payment_method || "cash", 50),
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported POS operation: ${operation}`);
  }
}

async function executeGenericStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  operation: string,
  _params: Record<string, unknown>,
) {
  // For unsupported modules, log the action attempt
  await supabase.from("ai_action_cards").insert({
    company_id: companyId,
    card_type: "general",
    title: sanitizeText(`Pending: ${operation}`, 200),
    description: "This operation requires manual execution.",
    suggested_data: _params,
    status: "pending",
    source_module: "ai",
  });
}
