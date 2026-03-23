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

/**
 * When a vendor bill is paid (AP),
 * create an accounting journal entry:
 *   Debit: Accounts Payable (liability) — reduces what we owe
 *   Credit: Cash/Bank (asset) — cash going out
 */
export async function createVendorBillPaidJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  billId: string,
  amount: number,
  billNumber: string,
  paymentId?: string,
) {
  const cashAccount = await ensureAccount(supabase, orgId, "1100", "Cash / Bank", "asset");
  const payableAccount = await ensureAccount(supabase, orgId, "2100", "Accounts Payable", "liability");

  if (!cashAccount || !payableAccount) return null;

  const idempotencyKey = paymentId ? `bill-payment-${paymentId}` : `bill-payment-${billId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Payment for Bill ${billNumber}`,
      reference_number: `BILL-PAID-${billNumber}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] bill payment journal error:", txErr.message);
    return null;
  }

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: payableAccount,
      debit: amount,
      credit: 0,
      description: `AP Payment: Bill ${billNumber}`,
    },
    {
      transaction_id: tx.id,
      account_id: cashAccount,
      debit: 0,
      credit: amount,
      description: `Cash Out: Bill ${billNumber}`,
    },
  ]);

  return tx.id;
}

/**
 * When payroll is processed,
 * create an accounting journal entry:
 *   Debit: Salary Expense (expense)
 *   Credit: Cash/Bank (asset)
 */
export async function createPayrollJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  payrollId: string,
  grossSalary: number,
  netSalary: number,
  periodLabel: string,
) {
  const salaryExpenseAccount = await ensureAccount(supabase, orgId, "5100", "Salary Expense", "expense");
  const cashAccount = await ensureAccount(supabase, orgId, "1100", "Cash / Bank", "asset");

  if (!salaryExpenseAccount || !cashAccount) return null;

  const idempotencyKey = `payroll-${payrollId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Payroll: ${periodLabel}`,
      reference_number: `PAY-${payrollId.slice(0, 8)}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] payroll journal error:", txErr.message);
    return null;
  }

  /* If deductions exist, route them through a payables/withholding account */
  const deductions = grossSalary - netSalary;
  const lines = [
    {
      transaction_id: tx.id,
      account_id: salaryExpenseAccount,
      debit: grossSalary,
      credit: 0,
      description: `Gross salary: ${periodLabel}`,
    },
    {
      transaction_id: tx.id,
      account_id: cashAccount,
      debit: 0,
      credit: netSalary,
      description: `Net pay: ${periodLabel}`,
    },
  ];

  if (deductions > 0) {
    const withholdingAccount = await ensureAccount(supabase, orgId, "2200", "Payroll Withholdings", "liability");
    if (withholdingAccount) {
      lines.push({
        transaction_id: tx.id,
        account_id: withholdingAccount,
        debit: 0,
        credit: deductions,
        description: `Deductions: ${periodLabel}`,
      });
    }
  }

  await supabase.from("transaction_lines").insert(lines);

  return tx.id;
}

/**
 * When an invoice payment is recorded (partial or full),
 * create a journal entry:
 *   Debit: Cash/Bank (asset)
 *   Credit: Accounts Receivable (asset)
 */
export async function createPaymentReceivedJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  paymentId: string,
  amount: number,
  invoiceNumber: string,
) {
  const cashAccount = await ensureAccount(supabase, orgId, "1100", "Cash / Bank", "asset");
  const arAccount = await ensureAccount(supabase, orgId, "1200", "Accounts Receivable", "asset");

  if (!cashAccount || !arAccount) return null;

  const idempotencyKey = `payment-received-${paymentId}`;

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      org_id: orgId,
      date: new Date().toISOString().slice(0, 10),
      description: `Payment received: Invoice ${invoiceNumber}`,
      reference_number: `PMT-${paymentId.slice(0, 8)}`,
      status: "posted",
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (txErr) {
    if (txErr.code === "23505") return null;
    console.error("[cross-module] payment received journal error:", txErr.message);
    return null;
  }

  await supabase.from("transaction_lines").insert([
    {
      transaction_id: tx.id,
      account_id: cashAccount,
      debit: amount,
      credit: 0,
      description: `Cash received: Invoice ${invoiceNumber}`,
    },
    {
      transaction_id: tx.id,
      account_id: arAccount,
      debit: 0,
      credit: amount,
      description: `AR cleared: Invoice ${invoiceNumber}`,
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
