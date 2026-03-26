import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

/**
 * Default chart of accounts — a standard set of accounts for small businesses.
 * Covers: Assets, Liabilities, Equity, Revenue, and Expenses.
 */
const DEFAULT_CHART_OF_ACCOUNTS: { code: string; name: string; type: string }[] = [
  // Assets
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1010", name: "Petty Cash", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  { code: "1300", name: "Prepaid Expenses", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1510", name: "Accumulated Depreciation", type: "asset" },
  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "Accrued Liabilities", type: "liability" },
  { code: "2200", name: "Sales Tax Payable", type: "liability" },
  { code: "2300", name: "Wages Payable", type: "liability" },
  { code: "2500", name: "Short-Term Loans", type: "liability" },
  { code: "2600", name: "Long-Term Loans", type: "liability" },
  // Equity
  { code: "3000", name: "Owner\u2019s Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "3200", name: "Drawing / Distributions", type: "equity" },
  // Revenue
  { code: "4000", name: "Sales Revenue", type: "revenue" },
  { code: "4100", name: "Service Revenue", type: "revenue" },
  { code: "4200", name: "Other Income", type: "revenue" },
  { code: "4300", name: "Interest Income", type: "revenue" },
  // Expenses
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "Salaries & Wages", type: "expense" },
  { code: "5200", name: "Rent Expense", type: "expense" },
  { code: "5300", name: "Utilities Expense", type: "expense" },
  { code: "5400", name: "Office Supplies", type: "expense" },
  { code: "5500", name: "Advertising & Marketing", type: "expense" },
  { code: "5600", name: "Depreciation Expense", type: "expense" },
  { code: "5700", name: "Insurance Expense", type: "expense" },
  { code: "5800", name: "Bank Fees", type: "expense" },
  { code: "5900", name: "Miscellaneous Expense", type: "expense" },
];

/**
 * GET — return setup status: whether default accounts have been seeded.
 */
export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", guard.context.organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.setup.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    accounts_count: count ?? 0,
    is_setup_complete: (count ?? 0) > 0,
    default_accounts: DEFAULT_CHART_OF_ACCOUNTS,
  });
}

/**
 * POST — seed default chart of accounts for the organization.
 * Body (optional): { currency?: string }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    currency?: string;
    fiscal_year_end?: string;
  };

  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const orgId = guard.context.organizationId;

  // Update organization currency if provided
  if (body.currency) {
    const { error: currError } = await supabase
      .from("organizations")
      .update({ currency: body.currency })
      .eq("id", orgId);
    if (currError) {
      return NextResponse.json({ error: currError.message }, { status: 500 });
    }
  }

  // Check if accounts already exist (idempotent)
  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      contract: "accounting.setup.v1",
      status: "already_setup",
      message: "Chart of accounts already exists. Skipped seeding.",
      accounts_count: count,
    });
  }

  // Insert default chart of accounts
  const rows = DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
    org_id: orgId,
    code: a.code,
    name: a.name,
    type: a.type,
    is_active: true,
  }));

  const { error: insertError, data: inserted } = await supabase
    .from("accounts")
    .insert(rows)
    .select("id, code, name, type");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      contract: "accounting.setup.v1",
      status: "created",
      organization_id: orgId,
      accounts_created: inserted?.length ?? 0,
      emitted_events: ["accounting.setup.completed"],
    },
    { status: 201 },
  );
}
