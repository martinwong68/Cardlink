import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { validateTransactionBalance } from "@/src/lib/accounting-utils";

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

/** Generate a short unique identifier (prefix + timestamp + random) */
function generateUniqueCode(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
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
      return executePosStep(supabase, companyId, userId, step.operation, params);
    case "procurement":
      return executeProcurementStep(supabase, companyId, userId, step.operation, params);
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

      // Ensure the expense account and the cash/bank account exist
      const expenseAccountId = await ensureAccount(supabase, companyId, category, "expense");
      const cashAccountId = await ensureAccount(supabase, companyId, "Cash / Bank", "asset");

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

      // Double-entry: Debit Expense, Credit Cash/Bank
      const expenseLines = [
        { debit: amount, credit: 0 },
        { debit: 0, credit: amount },
      ];
      const balance = validateTransactionBalance(expenseLines);
      if (!balance.valid) {
        throw new Error(`Expense journal entry does not balance (debits ${balance.debitTotal} ≠ credits ${balance.creditTotal}).`);
      }

      const { error: lineError } = await supabase
        .from("transaction_lines")
        .insert([
          {
            transaction_id: txn.id,
            account_id: expenseAccountId,
            debit: amount,
            credit: 0,
            description,
          },
          {
            transaction_id: txn.id,
            account_id: cashAccountId,
            debit: 0,
            credit: amount,
            description: `Cash out: ${description}`,
          },
        ]);
      if (lineError) throw new Error(lineError.message);

      return;
    }
    case "create_invoice": {
      const amount = sanitizeAmount(params.amount ?? params.total);
      if (amount <= 0) throw new Error("Invoice amount must be greater than zero.");

      const clientName = sanitizeText(params.customer_name ?? params.customer ?? params.client_name, 200);
      if (!clientName) throw new Error("Customer / client name is required for an invoice.");

      const today = new Date().toISOString().slice(0, 10);
      const invoiceNumber = generateUniqueCode("INV");

      const { error } = await supabase.from("invoices").insert({
        org_id: companyId,
        invoice_number: invoiceNumber,
        client_name: clientName,
        client_email: sanitizeText(params.client_email ?? params.email, 200) || null,
        issue_date: today,
        due_date: params.due_date
          ? String(params.due_date).slice(0, 10)
          : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
        status: "draft",
        total: amount,
        tax: sanitizeAmount(params.tax),
        currency: sanitizeText(params.currency, 10) || "USD",
        notes: sanitizeText(params.notes, 500) || null,
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
          // Validate balance before inserting
          const balance = validateTransactionBalance(lines);
          if (!balance.valid) {
            throw new Error(`Journal entry does not balance: debits ${balance.debitTotal.toFixed(2)} ≠ credits ${balance.creditTotal.toFixed(2)}.`);
          }
          const { error: lineError } = await supabase.from("transaction_lines").insert(lines);
          if (lineError) throw new Error(lineError.message);
        }
      }
      return;
    }
    case "record_payment": {
      const amount = sanitizeAmount(params.amount);
      if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

      const paymentDate = params.date
        ? String(params.date).slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const method = sanitizeText(params.payment_method || "cash", 50);
      const reference = sanitizeText(params.reference, 200) || null;
      const notes = sanitizeText(params.notes, 500) || null;

      // If the AI provides a related invoice/bill, use the payments table
      const relatedType = sanitizeText(params.related_type, 50);
      const relatedId = params.related_id ? String(params.related_id) : null;

      if (relatedType && relatedId && ["invoice", "vendor_bill"].includes(relatedType)) {
        const paymentNumber = generateUniqueCode("PAY");
        const paymentType = relatedType === "invoice" ? "received" : "made";

        const { error } = await supabase.from("payments").insert({
          org_id: companyId,
          payment_number: paymentNumber,
          payment_type: paymentType,
          related_type: relatedType,
          related_id: relatedId,
          amount,
          payment_method: method,
          payment_date: paymentDate,
          reference,
          notes,
          created_by: userId,
        });
        if (error) throw new Error(error.message);
      } else {
        // Standalone payment — record as a transaction with transaction_lines
        const description = sanitizeText(
          params.description || `Payment received — ${method}`,
        );
        const category = sanitizeText(params.category || "Payment", 100);
        const revenueAccountId = await ensureAccount(supabase, companyId, category, "revenue");
        const cashAccountId = await ensureAccount(supabase, companyId, "Cash / Bank", "asset");

        const { data: txn, error: txnError } = await supabase
          .from("transactions")
          .insert({
            org_id: companyId,
            description,
            date: paymentDate,
            reference_number: reference,
            status: "posted",
            created_by: userId,
          })
          .select("id")
          .single();
        if (txnError) throw new Error(txnError.message);

        // Double-entry: Debit Cash/Bank, Credit Revenue
        const paymentLines = [
          { debit: amount, credit: 0 },
          { debit: 0, credit: amount },
        ];
        const balance = validateTransactionBalance(paymentLines);
        if (!balance.valid) {
          throw new Error(`Payment journal entry does not balance (debits ${balance.debitTotal} ≠ credits ${balance.creditTotal}).`);
        }

        const { error: lineError } = await supabase
          .from("transaction_lines")
          .insert([
            {
              transaction_id: txn.id,
              account_id: cashAccountId,
              debit: amount,
              credit: 0,
              description,
            },
            {
              transaction_id: txn.id,
              account_id: revenueAccountId,
              credit: amount,
              debit: 0,
              description,
            },
          ]);
        if (lineError) throw new Error(lineError.message);
      }
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
      // Read-only — find the product and its stock balance.
      const searchName = sanitizeText(params.product ?? params.product_name, 200);
      const escapedName = escapeIlikePattern(searchName);
      const { data: product, error: findError } = await supabase
        .from("inv_products")
        .select("id, name, sku")
        .eq("company_id", companyId)
        .ilike("name", `%${escapedName}%`)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!product) throw new Error(`Product not found: ${searchName}`);

      // Look up the stock balance
      const { data: balance } = await supabase
        .from("inv_stock_balances")
        .select("on_hand")
        .eq("product_id", product.id)
        .eq("company_id", companyId)
        .maybeSingle();

      // Stock info is available even if balance row is missing (means 0)
      const onHand = balance?.on_hand ?? 0;
      // Result is informational; the step succeeds if product exists
      console.log(`[check_stock] ${product.name}: ${onHand} on hand`);
      return;
    }
    case "adjust_stock": {
      const productName = sanitizeText(params.product ?? params.product_name, 200);
      if (!productName) throw new Error("Product name is required for stock adjustment.");

      const escapedName = escapeIlikePattern(productName);
      const { data: product, error: findError } = await supabase
        .from("inv_products")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", `%${escapedName}%`)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!product) throw new Error(`Product not found: ${productName}`);

      const qty = sanitizeAmount(params.quantity ?? params.stock_quantity);

      // Upsert inv_stock_balances for this product
      const { error } = await supabase
        .from("inv_stock_balances")
        .upsert(
          {
            product_id: product.id,
            company_id: companyId,
            on_hand: qty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,company_id" },
        );
      if (error) throw new Error(error.message);
      return;
    }
    case "add_product": {
      const name = sanitizeText(params.name ?? params.product_name, 200);
      if (!name) throw new Error("Product name is required.");

      // Check if product already exists (exact match, case insensitive)
      const escapedName = escapeIlikePattern(name);
      const { data: existing } = await supabase
        .from("inv_products")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", escapedName)
        .limit(1)
        .maybeSingle();
      if (existing) throw new Error(`Product "${name}" already exists.`);

      // Generate a SKU if not provided (required NOT NULL)
      const sku = sanitizeText(params.sku, 100) || generateUniqueCode("SKU");

      const { data: created, error } = await supabase
        .from("inv_products")
        .insert({
          company_id: companyId,
          name,
          sku,
          unit: sanitizeText(params.unit, 20) || "pcs",
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // Set initial stock balance if quantity is provided
      const initialQty = sanitizeAmount(params.quantity ?? params.stock_quantity);
      if (initialQty > 0) {
        const { error: balError } = await supabase
          .from("inv_stock_balances")
          .insert({
            product_id: created.id,
            company_id: companyId,
            on_hand: initialQty,
          });
        if (balError) throw new Error(balError.message);
      }
      return;
    }
    case "transfer_stock": {
      const productName = sanitizeText(params.product ?? params.product_name, 200);
      if (!productName) throw new Error("Product name is required for stock transfer.");

      const fromWarehouse = sanitizeText(params.from_warehouse, 200);
      const toWarehouse = sanitizeText(params.to_warehouse, 200);
      if (!fromWarehouse || !toWarehouse) {
        throw new Error("Both from_warehouse and to_warehouse are required for stock transfer.");
      }

      const qty = sanitizeAmount(params.quantity ?? params.qty);
      if (qty <= 0) throw new Error("Transfer quantity must be greater than zero.");

      const escapedName = escapeIlikePattern(productName);
      const { data: product, error: findError } = await supabase
        .from("inv_products")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${escapedName}%`)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!product) throw new Error(`Product not found: ${productName}`);

      // Record the stock movement
      const { error: movError } = await supabase.from("inv_movements").insert({
        company_id: companyId,
        product_id: product.id,
        movement_type: "transfer",
        quantity: qty,
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        notes: sanitizeText(params.notes, 500) || null,
        movement_date: new Date().toISOString().slice(0, 10),
      });
      if (movError) throw new Error(movError.message);
      return;
    }
    case "create_stock_take": {
      const warehouse = sanitizeText(params.warehouse, 200) || null;
      const products = Array.isArray(params.products) ? params.products.slice(0, 200) : [];

      const stockTakeNumber = generateUniqueCode("ST");

      const { data: stockTake, error: stError } = await supabase
        .from("inv_stock_takes")
        .insert({
          company_id: companyId,
          stock_take_number: stockTakeNumber,
          warehouse: warehouse,
          status: "draft",
          take_date: new Date().toISOString().slice(0, 10),
          notes: sanitizeText(params.notes, 500) || null,
        })
        .select("id")
        .single();
      if (stError) throw new Error(stError.message);

      // Insert counted items if provided
      if (products.length > 0 && stockTake) {
        for (const item of products) {
          const pName = sanitizeText((item as Record<string, unknown>).product_name ?? (item as Record<string, unknown>).name, 200);
          if (!pName) continue;

          const escapedPName = escapeIlikePattern(pName);
          const { data: prod } = await supabase
            .from("inv_products")
            .select("id")
            .eq("company_id", companyId)
            .ilike("name", `%${escapedPName}%`)
            .limit(1)
            .maybeSingle();

          if (prod) {
            await supabase.from("inv_stock_take_lines").insert({
              stock_take_id: stockTake.id,
              product_id: prod.id,
              counted_qty: sanitizeAmount((item as Record<string, unknown>).counted_qty ?? (item as Record<string, unknown>).quantity),
            });
          }
        }
      }
      return;
    }
    default:
      throw new Error(`Unsupported inventory operation: ${operation}`);
  }
}

async function executeProcurementStep(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  userId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "create_purchase_order": {
      const vendorName = sanitizeText(params.vendor_name ?? params.vendor, 200);
      if (!vendorName) throw new Error("Vendor name is required for a purchase order.");

      const items = Array.isArray(params.items) ? params.items.slice(0, 100) : [];
      const totalAmount = items.reduce((sum: number, item: Record<string, unknown>) => {
        const qty = Math.max(1, Math.round(Number(item.qty ?? item.quantity ?? 1)));
        return sum + sanitizeAmount(item.unit_price) * qty;
      }, 0);

      const poNumber = generateUniqueCode("PO");

      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          company_id: companyId,
          po_number: poNumber,
          vendor_name: vendorName,
          status: "draft",
          total: totalAmount,
          notes: sanitizeText(params.notes, 500) || null,
          order_date: new Date().toISOString().slice(0, 10),
          created_by: userId,
        })
        .select("id")
        .single();
      if (poError) throw new Error(poError.message);

      // Insert line items if provided
      if (items.length > 0 && po) {
        const poItems = items.map((item: Record<string, unknown>) => {
          const qty = Math.max(1, Math.round(Number(item.qty ?? item.quantity ?? 1)));
          const unitPrice = sanitizeAmount(item.unit_price);
          return {
            po_id: po.id,
            item_name: sanitizeText(item.name ?? item.product_name, 200) || "Item",
            qty,
            unit_price: unitPrice,
            subtotal: unitPrice * qty,
          };
        });
        const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItems);
        if (itemsError) {
          console.error("[create_purchase_order] Failed to insert PO items:", itemsError.message);
        }
      }
      return;
    }
    case "receive_goods": {
      const poId = params.purchase_order_id ? String(params.purchase_order_id) : null;
      const vendorName = sanitizeText(params.vendor_name ?? params.vendor, 200);
      const totalAmount = sanitizeAmount(params.total_amount ?? params.amount);

      if (!poId && !vendorName) {
        throw new Error("Either purchase_order_id or vendor_name is required to receive goods.");
      }

      const receiptNumber = generateUniqueCode("GR");

      const { data: receipt, error: receiptError } = await supabase
        .from("goods_receipts")
        .insert({
          company_id: companyId,
          receipt_number: receiptNumber,
          purchase_order_id: poId,
          vendor_name: vendorName || null,
          status: "received",
          total: totalAmount,
          receipt_date: new Date().toISOString().slice(0, 10),
          notes: sanitizeText(params.notes, 500) || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (receiptError) throw new Error(receiptError.message);

      // Create accounting journal entry: Debit Inventory, Credit AP
      await ensureOrgExists(supabase, companyId);
      if (totalAmount > 0) {
        const { createReceiptJournalEntry } = await import("@/src/lib/cross-module-integration");
        await createReceiptJournalEntry(
          supabase,
          companyId,
          userId,
          receipt.id,
          totalAmount,
          `Goods receipt ${receiptNumber}`,
        );
      }
      return;
    }
    case "pay_vendor_bill": {
      const billId = params.bill_id ? String(params.bill_id) : null;
      const vendorName = sanitizeText(params.vendor_name ?? params.vendor, 200);
      const amount = sanitizeAmount(params.amount);
      if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

      const paymentMethod = sanitizeText(params.payment_method || "bank_transfer", 50);
      const billNumber = sanitizeText(params.bill_number, 100) || generateUniqueCode("BILL");

      // If bill_id given, mark the vendor bill as paid
      if (billId) {
        const { error: updateError } = await supabase
          .from("vendor_bills")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", billId)
          .eq("company_id", companyId);
        if (updateError) throw new Error(updateError.message);
      }

      // Record payment
      const paymentNumber = generateUniqueCode("PAY");
      const { data: payment, error: payError } = await supabase
        .from("payments")
        .insert({
          org_id: companyId,
          payment_number: paymentNumber,
          payment_type: "made",
          related_type: billId ? "vendor_bill" : null,
          related_id: billId,
          amount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().slice(0, 10),
          notes: vendorName ? `Payment to ${vendorName}` : null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (payError) throw new Error(payError.message);

      // Create accounting journal entry: Debit AP, Credit Cash
      await ensureOrgExists(supabase, companyId);
      const { createVendorBillPaidJournalEntry } = await import("@/src/lib/cross-module-integration");
      await createVendorBillPaidJournalEntry(
        supabase,
        companyId,
        userId,
        billId ?? paymentNumber,
        amount,
        billNumber,
        payment.id,
      );
      return;
    }
    default:
      throw new Error(`Unsupported procurement operation: ${operation}`);
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
  userId: string,
  operation: string,
  params: Record<string, unknown>,
) {
  switch (operation) {
    case "record_sale": {
      const total = sanitizeAmount(params.amount ?? params.total);
      if (total <= 0) throw new Error("Sale total must be greater than zero.");

      const taxRate = sanitizeAmount(params.tax_rate ?? 0);
      const subtotal = taxRate > 0 ? +(total / (1 + taxRate)).toFixed(2) : total;
      const tax = +(total - subtotal).toFixed(2);
      const orderNumber = generateUniqueCode("ORD");

      const { data: order, error } = await supabase
        .from("pos_orders")
        .insert({
          company_id: companyId,
          order_number: orderNumber,
          status: "completed",
          subtotal,
          tax_rate: taxRate,
          tax,
          total,
          payment_method: sanitizeText(params.payment_method || "cash", 50),
          customer_name: sanitizeText(params.customer_name, 200) || null,
          notes: sanitizeText(params.notes, 500) || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // Insert order items if provided
      const items = Array.isArray(params.items) ? params.items.slice(0, 100) : [];
      if (items.length > 0 && order) {
        const orderItems = items.map((item: Record<string, unknown>) => ({
          order_id: order.id,
          product_name: sanitizeText(item.name ?? item.product_name, 200) || "Item",
          qty: Math.max(1, Math.round(Number(item.qty ?? item.quantity ?? 1))),
          unit_price: sanitizeAmount(item.unit_price ?? item.price),
          subtotal: sanitizeAmount(
            item.subtotal ??
              (Number(item.unit_price ?? item.price ?? 0) *
                Number(item.qty ?? item.quantity ?? 1)),
          ),
        }));
        const { error: itemsError } = await supabase
          .from("pos_order_items")
          .insert(orderItems);
        if (itemsError) {
          console.error("[record_sale] Failed to insert order items:", itemsError.message);
        }
      }
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
