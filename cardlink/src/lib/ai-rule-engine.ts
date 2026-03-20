import { createClient } from "@/src/lib/supabase/client";
import { notifyAiSuggestion } from "@/src/lib/business-notifications";

const RULE_ENGINE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const lastRunKey = "cardlink_rule_engine_last_run";

/**
 * Run business rules to generate action cards WITHOUT calling an LLM.
 * Returns the number of new cards created.
 */
export async function runBusinessRules(
  companyId: string,
  userId: string
): Promise<number> {
  // Throttle: don't re-run if last run was < 1 hour ago
  if (typeof window !== "undefined") {
    const lastRun = sessionStorage.getItem(`${lastRunKey}_${companyId}`);
    if (lastRun && Date.now() - Number(lastRun) < RULE_ENGINE_COOLDOWN_MS) {
      return 0;
    }
  }

  const supabase = createClient();
  let cardsCreated = 0;

  try {
    cardsCreated += await ruleMissingPaymentEntry(supabase, companyId);
    cardsCreated += await ruleOverdueInvoice(supabase, companyId);
    cardsCreated += await ruleLowStock(supabase, companyId);
    cardsCreated += await ruleMonthEndClosing(supabase, companyId);
    cardsCreated += await ruleUnlinkedDocuments(supabase, companyId);
    cardsCreated += await rulePayrollJournalEntry(supabase, companyId);
    cardsCreated += await ruleUpcomingBooking(supabase, companyId);
  } catch (err) {
    console.error("[RuleEngine] Error running business rules:", err);
  }

  // Mark last run
  if (typeof window !== "undefined") {
    sessionStorage.setItem(`${lastRunKey}_${companyId}`, String(Date.now()));
  }

  // Notify user if new cards were created
  if (cardsCreated > 0) {
    await notifyAiSuggestion(
      companyId,
      userId,
      "AI found new action items",
      cardsCreated
    );
  }

  return cardsCreated;
}

/* ── Helpers ── */
type SupabaseClient = ReturnType<typeof createClient>;

async function hasPendingCard(
  supabase: SupabaseClient,
  companyId: string,
  titlePattern: string
): Promise<boolean> {
  const { count } = await supabase
    .from("ai_action_cards")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "pending")
    .ilike("title", titlePattern);
  return (count ?? 0) > 0;
}

/* ── Rule 1: Missing payment entry ── */
async function ruleMissingPaymentEntry(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  let created = 0;

  // Get paid invoices from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, paid_at")
    .eq("org_id", companyId)
    .eq("status", "paid")
    .gte("paid_at", thirtyDaysAgo)
    .limit(20);

  if (!paidInvoices || paidInvoices.length === 0) return 0;

  for (const inv of paidInvoices) {
    const amount = Number(inv.total_amount ?? 0);
    const paidAt = inv.paid_at as string | null;
    if (!paidAt || amount <= 0) continue;

    // Check if a journal entry exists for this amount ±3 days
    const paidDate = new Date(paidAt);
    const dateBefore = new Date(paidDate.getTime() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dateAfter = new Date(paidDate.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { count: matchingEntries } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", companyId)
      .eq("amount", amount)
      .gte("date", dateBefore)
      .lte("date", dateAfter);

    if ((matchingEntries ?? 0) === 0) {
      // Check for duplicate pending card
      const exists = await hasPendingCard(
        supabase,
        companyId,
        `%${inv.invoice_number}%payment%`
      );
      if (exists) continue;

      const { error } = await supabase.from("ai_action_cards").insert({
        company_id: companyId,
        card_type: "journal_entry",
        title: `Missing payment entry for Invoice ${inv.invoice_number}`,
        description: `Invoice ${inv.invoice_number} was marked paid ($${amount.toLocaleString()}) but no matching journal entry found. Suggest recording the payment.`,
        suggested_data: {
          entries: [
            { account: "Cash / Bank", debit: amount, credit: 0 },
            { account: "Accounts Receivable", debit: 0, credit: amount },
          ],
          invoice_id: inv.id,
          amount,
        },
        confidence_score: 1.0,
        source_module: "rule_engine",
        status: "pending",
      });
      if (!error) created++;
    }
  }

  return created;
}

/* ── Rule 2: Overdue invoice ── */
async function ruleOverdueInvoice(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  let created = 0;

  const today = new Date().toISOString().slice(0, 10);
  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date, total_amount, customer_name")
    .eq("org_id", companyId)
    .lt("due_date", today)
    .not("status", "in", '("paid","cancelled")')
    .limit(20);

  if (!overdueInvoices || overdueInvoices.length === 0) return 0;

  for (const inv of overdueInvoices) {
    const dueDate = inv.due_date as string;
    const daysOverdue = Math.floor(
      (Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const exists = await hasPendingCard(
      supabase,
      companyId,
      `%${inv.invoice_number}%overdue%`
    );
    if (exists) continue;

    const { error } = await supabase.from("ai_action_cards").insert({
      company_id: companyId,
      card_type: "general",
      title: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue`,
      description: `Invoice ${inv.invoice_number} for ${inv.customer_name ?? "customer"} ($${Number(inv.total_amount ?? 0).toLocaleString()}) was due on ${dueDate}. Consider sending a payment reminder.`,
      suggested_data: {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        days_overdue: daysOverdue,
        amount: Number(inv.total_amount ?? 0),
        action: "send_reminder",
      },
      confidence_score: 0.85,
      source_module: "rule_engine",
      status: "pending",
    });
    if (!error) created++;
  }

  return created;
}

/* ── Rule 3: Low stock ── */
async function ruleLowStock(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  let created = 0;

  const { data: products } = await supabase
    .from("inv_products")
    .select("id, name, sku, reorder_level")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .gt("reorder_level", 0)
    .limit(50);

  if (!products || products.length === 0) return 0;

  const pIds = products.map((p) => p.id as string);
  const { data: balances } = await supabase
    .from("inv_stock_balances")
    .select("product_id, on_hand")
    .in("product_id", pIds);

  const balMap = new Map(
    ((balances ?? []) as { product_id: string; on_hand: number }[]).map((b) => [
      b.product_id,
      b.on_hand,
    ])
  );

  for (const product of products) {
    const onHand = balMap.get(product.id as string) ?? 0;
    const reorderLevel = Number(product.reorder_level ?? 0);

    if (onHand >= reorderLevel) continue;

    const exists = await hasPendingCard(
      supabase,
      companyId,
      `%${product.name}%low stock%`
    );
    if (exists) continue;

    const suggestedQty = Math.max(reorderLevel * 2 - onHand, reorderLevel);

    const { error } = await supabase.from("ai_action_cards").insert({
      company_id: companyId,
      card_type: "inventory_update",
      title: `${product.name} — low stock alert`,
      description: `${product.name} (SKU: ${product.sku ?? "—"}) has ${onHand} units in stock, below the reorder level of ${reorderLevel}. Consider placing a reorder.`,
      suggested_data: {
        product_id: product.id,
        product: product.name,
        sku: product.sku,
        current_stock: onHand,
        reorder_level: reorderLevel,
        suggested_quantity: suggestedQty,
        action: "reorder",
      },
      confidence_score: 0.95,
      source_module: "rule_engine",
      status: "pending",
    });
    if (!error) created++;
  }

  return created;
}

/* ── Rule 4: Month-end closing reminder ── */
async function ruleMonthEndClosing(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysUntilEnd = lastDay - now.getDate();

  if (daysUntilEnd > 5) return 0;

  // Only create once per month
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const exists = await hasPendingCard(
    supabase,
    companyId,
    `%month-end%${monthKey}%`
  );

  // Also check recently created cards (not just pending)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: recentCount } = await supabase
    .from("ai_action_cards")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .ilike("title", `%Month-end closing%`)
    .gte("created_at", monthStart);

  if (exists || (recentCount ?? 0) > 0) return 0;

  const { error } = await supabase.from("ai_action_cards").insert({
    company_id: companyId,
    card_type: "general",
    title: `Month-end closing reminder — ${monthKey}`,
    description: `Month-end is approaching (${daysUntilEnd} days left). Review: 1) Reconcile bank statements 2) Review pending invoices 3) Verify inventory counts 4) Close pending journal entries 5) Generate financial reports.`,
    suggested_data: {
      month: monthKey,
      days_until_end: daysUntilEnd,
      checklist: [
        "Reconcile bank statements",
        "Review pending invoices",
        "Verify inventory counts",
        "Close pending journal entries",
        "Generate financial reports",
      ],
    },
    confidence_score: 0.8,
    source_module: "rule_engine",
    status: "pending",
  });

  return error ? 0 : 1;
}

/* ── Rule 5: Unlinked documents ── */
async function ruleUnlinkedDocuments(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  let created = 0;

  // Check if documents table exists by querying it
  const { data: docs, error: docError } = await supabase
    .from("documents")
    .select("id, file_name, created_at")
    .eq("company_id", companyId)
    .is("linked_entity_id", null)
    .limit(10);

  // If table doesn't exist or query fails, skip
  if (docError || !docs || docs.length === 0) return 0;

  for (const doc of docs) {
    const exists = await hasPendingCard(
      supabase,
      companyId,
      `%${doc.file_name}%unlinked%`
    );
    if (exists) continue;

    const { error } = await supabase.from("ai_action_cards").insert({
      company_id: companyId,
      card_type: "general",
      title: `Unlinked document: ${doc.file_name}`,
      description: `Document "${doc.file_name}" was uploaded but isn't linked to any transaction or record. Consider matching it to the relevant entry.`,
      suggested_data: {
        document_id: doc.id,
        file_name: doc.file_name,
        action: "link_document",
      },
      confidence_score: 0.7,
      source_module: "rule_engine",
      status: "pending",
    });
    if (!error) created++;
  }

  return created;
}

/* ── Rule 6: Payroll → Accounting journal entry ── */
async function rulePayrollJournalEntry(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  let created = 0;

  // Find payroll records that were just marked paid (no matching action card yet)
  const { data: paidPayroll } = await supabase
    .from("hr_payroll")
    .select("id, period_start, period_end, net_pay, paid_at")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(20);

  if (!paidPayroll || paidPayroll.length === 0) return 0;

  // Group by period to create one card per pay period
  const periods = new Map<string, number>();
  for (const rec of paidPayroll) {
    const key = `${rec.period_start}_${rec.period_end}`;
    periods.set(key, (periods.get(key) ?? 0) + Number(rec.net_pay ?? 0));
  }

  for (const [key, totalPay] of periods) {
    const [pStart, pEnd] = key.split("_");
    const monthLabel = new Date(pStart as string).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

    // Check if a card already exists for this period (any status)
    const { count: anyCount } = await supabase
      .from("ai_action_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .ilike("title", `%Payroll journal%${monthLabel}%`);
    if ((anyCount ?? 0) > 0) continue;

    const { error } = await supabase.from("ai_action_cards").insert({
      company_id: companyId,
      card_type: "journal_entry",
      title: `Payroll journal entry for ${monthLabel}`,
      description: `Payroll for ${monthLabel} totalling $${totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been paid. Record journal entry: DR Salary Expense, CR Cash/Bank.`,
      suggested_data: {
        entries: [
          { account: "Salary Expense", debit: totalPay, credit: 0 },
          { account: "Cash / Bank", debit: 0, credit: totalPay },
        ],
        period_start: pStart,
        period_end: pEnd,
        total_pay: totalPay,
      },
      confidence_score: 1.0,
      source_module: "rule_engine",
      status: "pending",
    });
    if (!error) created++;
  }

  return created;
}

/* ── Rule 7: Upcoming booking reminder (placeholder for future AI reminders) ── */
async function ruleUpcomingBooking(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  // Notifications for upcoming bookings are handled in the booking API route.
  // This placeholder allows future expansion (e.g. AI-driven rescheduling).
  return 0;
}
