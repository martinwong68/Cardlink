import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { checkAiAccess, checkAiActionBalance } from "@/src/lib/plan-enforcement";
import { createClient } from "@/src/lib/supabase/server";
import { aiChat } from "@/src/lib/ai";
import { buildReviewAgentPrompt } from "@/src/lib/ai/agent-prompts";
import type { ReviewType } from "@/src/lib/ai/data-transformer";

/**
 * POST /api/business/ai/review
 *
 * Periodic Review Agent endpoint.
 * Accepts { reviewType: "daily" | "monthly" | "annual" } and
 * gathers business data to produce an audit report with suggestions.
 *
 * Can also be called by the cron endpoint for automated reviews.
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
    reviewType: ReviewType;
    model?: string;
  };

  if (!body.reviewType || !["daily", "monthly", "annual"].includes(body.reviewType)) {
    return NextResponse.json(
      { error: "reviewType must be 'daily', 'monthly', or 'annual'" },
      { status: 400 },
    );
  }

  // Fetch company info
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  // Gather business data based on review type
  const businessData = await gatherBusinessData(supabase, companyId, body.reviewType);

  // Build review agent system prompt
  const systemPrompt = buildReviewAgentPrompt({
    companyName: company?.name ?? "Unknown",
    reviewType: body.reviewType,
    businessData,
  });

  try {
    const response = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please run the ${body.reviewType} business review now and provide your analysis.`,
        },
      ],
      model: body.model,
    });

    // Increment usage counter
    await supabase.rpc("increment_ai_actions_used", { p_company_id: companyId });

    // Store the review
    await supabase.from("ai_business_reviews").insert({
      company_id: companyId,
      user_id: guard.context.user.id,
      review_type: body.reviewType,
      ai_response: response.content,
      status: "completed",
    });

    return NextResponse.json({ content: response.content, meta: response.meta });
  } catch (err) {
    console.error("[AI Review] Provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Please try again." },
      { status: 502 },
    );
  }
}

/* ── Gather business data for AI context ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherBusinessData(supabase: any, companyId: string, reviewType: ReviewType): Promise<string> {
  const now = new Date();
  const sections: string[] = [];

  if (reviewType === "daily") {
    const today = now.toISOString().split("T")[0];

    // POS orders today
    const { data: orders, count: orderCount } = await supabase
      .from("pos_orders")
      .select("id, total, status, payment_method", { count: "exact" })
      .eq("company_id", companyId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);
    sections.push(`POS ORDERS TODAY: ${orderCount ?? 0} orders`);
    if (orders?.length) {
      const totalRevenue = orders.reduce((sum: number, o: { total?: number }) => sum + (o.total ?? 0), 0);
      sections.push(`  Total revenue: ${totalRevenue}`);
    }

    // Invoices due today
    const { count: dueInvoices } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("due_date", today)
      .neq("status", "paid");
    sections.push(`INVOICES DUE TODAY: ${dueInvoices ?? 0}`);

    // Low stock items
    const { data: lowStock } = await supabase
      .from("inventory_products")
      .select("name, sku")
      .eq("company_id", companyId)
      .eq("is_low_stock", true)
      .limit(10);
    sections.push(`LOW STOCK ITEMS: ${lowStock?.length ?? 0}`);
    if (lowStock?.length) {
      sections.push(`  Items: ${lowStock.map((i: { name: string }) => i.name).join(", ")}`);
    }

  } else if (reviewType === "monthly") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = now.toISOString();

    // Monthly POS summary
    const { data: monthOrders } = await supabase
      .from("pos_orders")
      .select("total, status")
      .eq("company_id", companyId)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);
    const monthRevenue = monthOrders?.reduce((sum: number, o: { total?: number }) => sum + (o.total ?? 0), 0) ?? 0;
    sections.push(`MONTHLY POS REVENUE: ${monthRevenue} from ${monthOrders?.length ?? 0} orders`);

    // Accounts receivable
    const { data: arInvoices } = await supabase
      .from("invoices")
      .select("total, status, due_date")
      .eq("company_id", companyId)
      .neq("status", "paid")
      .order("due_date", { ascending: true });
    const arTotal = arInvoices?.reduce((sum: number, i: { total?: number }) => sum + (i.total ?? 0), 0) ?? 0;
    sections.push(`ACCOUNTS RECEIVABLE: ${arTotal} across ${arInvoices?.length ?? 0} unpaid invoices`);

    // Accounts payable
    const { data: apBills } = await supabase
      .from("vendor_bills")
      .select("total, status, due_date")
      .eq("company_id", companyId)
      .neq("status", "paid")
      .order("due_date", { ascending: true });
    const apTotal = apBills?.reduce((sum: number, b: { total?: number }) => sum + (b.total ?? 0), 0) ?? 0;
    sections.push(`ACCOUNTS PAYABLE: ${apTotal} across ${apBills?.length ?? 0} unpaid bills`);

    // Employee count
    const { count: employeeCount } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active");
    sections.push(`ACTIVE EMPLOYEES: ${employeeCount ?? 0}`);

    // Inventory value
    const { data: products } = await supabase
      .from("inventory_products")
      .select("name, cost_price")
      .eq("company_id", companyId)
      .eq("is_active", true);
    sections.push(`ACTIVE PRODUCTS: ${products?.length ?? 0}`);

  } else {
    // Annual — gather year-to-date data
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const yearEnd = now.toISOString();

    // Annual POS summary
    const { data: yearOrders } = await supabase
      .from("pos_orders")
      .select("total, status, created_at")
      .eq("company_id", companyId)
      .gte("created_at", yearStart)
      .lte("created_at", yearEnd);
    const yearRevenue = yearOrders?.reduce((sum: number, o: { total?: number }) => sum + (o.total ?? 0), 0) ?? 0;
    sections.push(`ANNUAL POS REVENUE: ${yearRevenue} from ${yearOrders?.length ?? 0} orders`);

    // Annual invoices
    const { data: yearInvoices } = await supabase
      .from("invoices")
      .select("total, status")
      .eq("company_id", companyId)
      .gte("created_at", yearStart);
    const invoiceTotal = yearInvoices?.reduce((sum: number, i: { total?: number }) => sum + (i.total ?? 0), 0) ?? 0;
    const paidInvoices = yearInvoices?.filter((i: { status: string }) => i.status === "paid").length ?? 0;
    sections.push(`ANNUAL INVOICES: ${invoiceTotal} total, ${paidInvoices}/${yearInvoices?.length ?? 0} paid`);

    // Annual expenses (bills)
    const { data: yearBills } = await supabase
      .from("vendor_bills")
      .select("total, status")
      .eq("company_id", companyId)
      .gte("created_at", yearStart);
    const billTotal = yearBills?.reduce((sum: number, b: { total?: number }) => sum + (b.total ?? 0), 0) ?? 0;
    sections.push(`ANNUAL EXPENSES: ${billTotal} across ${yearBills?.length ?? 0} bills`);

    // CRM deals
    const { data: yearDeals } = await supabase
      .from("crm_deals")
      .select("value, stage")
      .eq("company_id", companyId)
      .gte("created_at", yearStart);
    const dealValue = yearDeals?.reduce((sum: number, d: { value?: number }) => sum + (d.value ?? 0), 0) ?? 0;
    sections.push(`ANNUAL CRM DEALS: ${yearDeals?.length ?? 0} deals, total value ${dealValue}`);

    // Employee count
    const { count: empCount } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active");
    sections.push(`ACTIVE EMPLOYEES: ${empCount ?? 0}`);

    // Product count
    const { count: prodCount } = await supabase
      .from("inventory_products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true);
    sections.push(`ACTIVE PRODUCTS: ${prodCount ?? 0}`);
  }

  return sections.join("\n");
}
