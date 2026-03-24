import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

/**
 * POST /api/business/ai/execute
 *
 * Executes confirmed action steps from an AI preset card.
 * This runs the actions directly without re-asking the AI.
 *
 * Each step specifies a module, operation, and params.
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
};

type StepResult = {
  step: number;
  label: string;
  success: boolean;
  error?: string;
};

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;

  const body = (await request.json()) as ExecuteBody;

  if (!body.steps || body.steps.length === 0) {
    return NextResponse.json({ error: "No steps to execute." }, { status: 400 });
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

  const allSuccess = results.every((r) => r.success);

  // Store the execution as an action card for history
  await supabase.from("ai_action_cards").insert({
    company_id: companyId,
    card_type: "general",
    title: `Executed ${results.length} action(s)`,
    description: results.map((r) => `${r.success ? "✓" : "✗"} ${r.label}`).join("\n"),
    suggested_data: { steps: body.steps, answers: body.answers, results },
    status: allSuccess ? "approved" : "pending",
    source_module: body.steps[0]?.module ?? "ai",
    approved_by: allSuccess ? userId : null,
    approved_at: allSuccess ? new Date().toISOString() : null,
  });

  return NextResponse.json({
    success: allSuccess,
    results,
    message: allSuccess
      ? `All ${results.length} action(s) completed successfully.`
      : `${results.filter((r) => r.success).length}/${results.length} action(s) completed.`,
  });
}

/* ── Step executor ── */
async function executeStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "record_expense": {
      const { error } = await supabase.from("transactions").insert({
        company_id: companyId,
        type: "expense",
        amount: Number(params.amount ?? 0),
        description: String(params.description ?? ""),
        date: params.date ?? new Date().toISOString().slice(0, 10),
        category: params.category ?? "general",
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "create_invoice": {
      const { error } = await supabase.from("invoices").insert({
        company_id: companyId,
        customer_name: String(params.customer_name ?? params.customer ?? ""),
        amount: Number(params.amount ?? params.total ?? 0),
        due_date: params.due_date ?? null,
        status: "draft",
        notes: params.notes ?? null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "create_journal_entry": {
      const entries = (params.entries ?? []) as Array<{ account: string; debit: number; credit: number }>;
      const { error } = await supabase.from("journal_entries").insert({
        company_id: companyId,
        description: String(params.description ?? "AI-generated journal entry"),
        entries,
        date: params.date ?? new Date().toISOString().slice(0, 10),
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "check_stock": {
      // Read-only — no mutation. Just validate we can find the product.
      const { data, error } = await supabase
        .from("inventory_products")
        .select("id, name, stock_quantity")
        .eq("company_id", companyId)
        .ilike("name", String(params.product ?? params.product_name ?? ""))
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Product not found: ${String(params.product ?? params.product_name ?? "")}`);
      return;
    }
    case "adjust_stock": {
      // First find the product by name to get its unique ID
      const productName = String(params.product ?? params.product_name ?? "");
      const { data: product, error: findError } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", productName)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!product) throw new Error(`Product not found: ${productName}`);

      const { error } = await supabase
        .from("inventory_products")
        .update({ stock_quantity: Number(params.quantity ?? params.stock_quantity ?? 0) })
        .eq("id", product.id);
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported inventory operation: ${operation}`);
  }
}

async function executeCrmStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "add_lead": {
      const { error } = await supabase.from("crm_leads").insert({
        company_id: companyId,
        name: String(params.name ?? params.lead_name ?? ""),
        email: params.email ?? null,
        phone: params.phone ?? null,
        source: params.source ?? "ai",
        status: params.status ?? "new",
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "add_contact": {
      const { error } = await supabase.from("crm_contacts").insert({
        company_id: companyId,
        name: String(params.name ?? ""),
        email: params.email ?? null,
        phone: params.phone ?? null,
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported CRM operation: ${operation}`);
  }
}

async function executePosStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "record_sale": {
      const { error } = await supabase.from("pos_orders").insert({
        company_id: companyId,
        total: Number(params.amount ?? params.total ?? 0),
        items: params.items ?? [],
        status: "completed",
        payment_method: params.payment_method ?? "cash",
      });
      if (error) throw new Error(error.message);
      return;
    }
    default:
      throw new Error(`Unsupported POS operation: ${operation}`);
  }
}

async function executeGenericStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  operation: string,
  _params: Record<string, unknown>,
) {
  // For unsupported modules, log the action attempt
  await supabase.from("ai_action_cards").insert({
    company_id: companyId,
    card_type: "general",
    title: `Pending: ${operation}`,
    description: `This operation requires manual execution.`,
    suggested_data: _params,
    status: "pending",
    source_module: "ai",
  });
}
