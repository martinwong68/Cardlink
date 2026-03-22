/**
 * Cross-module integration helpers.
 *
 * Creates accounting journal entries when procurement or inventory events occur,
 * ensuring all modules stay in sync.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * When a procurement receipt is processed (goods received),
 * create an accounting journal entry:
 *   Debit: Inventory (asset)
 *   Credit: Accounts Payable (liability)
 */
export async function createReceiptJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  receiptId: string,
  totalAmount: number,
  description: string,
) {
  /* Find or create default accounts */
  const inventoryAccount = await ensureAccount(supabase, orgId, "1400", "Inventory", "asset");
  const payableAccount = await ensureAccount(supabase, orgId, "2100", "Accounts Payable", "liability");

  if (!inventoryAccount || !payableAccount) return null;

  const idempotencyKey = `receipt-journal-${receiptId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Goods Receipt: ${description}`,
      reference_number: `GR-${receiptId.slice(0, 8)}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    /* Idempotent replay — already exists */
    if (txErr.code === "23505") return null;
    console.error("[cross-module] receipt journal error:", txErr.message);
    return null;
  }

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: inventoryAccount,
      debit: totalAmount,
      credit: 0,
      description: "Inventory received",
    },
    {
      transaction_id: tx.id,
      account_id: payableAccount,
      debit: 0,
      credit: totalAmount,
      description: "Payable for goods received",
    },
  ]);

  return tx.id;
}

/**
 * When an invoice is marked as paid,
 * create an accounting journal entry:
 *   Debit: Cash/Bank (asset)
 *   Credit: Accounts Receivable (asset) or Revenue (revenue)
 */
export async function createInvoicePaidJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  invoiceId: string,
  totalAmount: number,
  invoiceNumber: string,
) {
  const cashAccount = await ensureAccount(supabase, orgId, "1100", "Cash / Bank", "asset");
  const revenueAccount = await ensureAccount(supabase, orgId, "4100", "Sales Revenue", "revenue");

  if (!cashAccount || !revenueAccount) return null;

  const idempotencyKey = `invoice-paid-${invoiceId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Payment received for Invoice ${invoiceNumber}`,
      reference_number: `INV-PAID-${invoiceNumber}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] invoice paid journal error:", txErr.message);
    return null;
  }

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: cashAccount,
      debit: totalAmount,
      credit: 0,
      description: `Payment: Invoice ${invoiceNumber}`,
    },
    {
      transaction_id: tx.id,
      account_id: revenueAccount,
      debit: 0,
      credit: totalAmount,
      description: `Revenue: Invoice ${invoiceNumber}`,
    },
  ]);

  return tx.id;
}

/**
 * When a POS order is completed,
 * create a journal entry + optional inventory movement.
 *   Debit: Cash (asset)
 *   Credit: Sales Revenue (revenue)
 */
export async function createPosOrderJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  orderId: string,
  totalAmount: number,
  orderNumber: string,
) {
  const cashAccount = await ensureAccount(supabase, orgId, "1100", "Cash / Bank", "asset");
  const revenueAccount = await ensureAccount(supabase, orgId, "4100", "Sales Revenue", "revenue");

  if (!cashAccount || !revenueAccount) return null;

  const idempotencyKey = `pos-order-${orderId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `POS Sale: Order ${orderNumber}`,
      reference_number: `POS-${orderNumber}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] pos journal error:", txErr.message);
    return null;
  }

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: cashAccount,
      debit: totalAmount,
      credit: 0,
      description: `POS Cash: ${orderNumber}`,
    },
    {
      transaction_id: tx.id,
      account_id: revenueAccount,
      debit: 0,
      credit: totalAmount,
      description: `POS Revenue: ${orderNumber}`,
    },
  ]);

  return tx.id;
}

/* ── Helper: ensure a default chart-of-accounts entry exists ── */
async function ensureAccount(
  supabase: SupabaseClient,
  orgId: string,
  code: string,
  name: string,
  type: "asset" | "liability" | "equity" | "revenue" | "expense",
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", code)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({ org_id: orgId, code, name, type, is_active: true })
    .select("id")
    .single();

  if (error) {
    /* Race condition — another request created it */
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("accounts")
        .select("id")
        .eq("org_id", orgId)
        .eq("code", code)
        .maybeSingle();
      return retry?.id ?? null;
    }
    console.error("[cross-module] ensureAccount error:", error.message);
    return null;
  }

  return created.id;
}

/**
 * When a stock adjustment is approved (e.g., from stock-take),
 * create an accounting journal entry:
 *   Debit/Credit: Inventory (asset)
 *   Credit/Debit: Inventory Adjustment (expense)
 */
export async function createStockAdjustmentJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  referenceId: string,
  totalAdjustmentValue: number,
  description: string,
) {
  if (totalAdjustmentValue === 0) return null;

  const inventoryAccount = await ensureAccount(supabase, orgId, "1400", "Inventory", "asset");
  const adjustmentAccount = await ensureAccount(supabase, orgId, "5300", "Inventory Adjustment", "expense");

  if (!inventoryAccount || !adjustmentAccount) return null;

  const idempotencyKey = `inv-adjust-${referenceId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Inventory Adjustment: ${description}`,
      reference_number: `ADJ-${referenceId.slice(0, 8)}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] adjustment journal error:", txErr.message);
    return null;
  }

  /* Positive adjustment = increase inventory, negative = decrease */
  const isIncrease = totalAdjustmentValue > 0;
  const absValue = Math.abs(totalAdjustmentValue);

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: isIncrease ? inventoryAccount : adjustmentAccount,
      debit: absValue,
      credit: 0,
      description: isIncrease ? "Inventory increase" : "Adjustment expense",
    },
    {
      transaction_id: tx.id,
      account_id: isIncrease ? adjustmentAccount : inventoryAccount,
      debit: 0,
      credit: absValue,
      description: isIncrease ? "Adjustment credit" : "Inventory decrease",
    },
  ]);

  return tx.id;
}
