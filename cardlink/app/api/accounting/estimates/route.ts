import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type EstimateItemDraft = {
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
};

type EstimateDraft = {
  org_id?: string;
  estimate_number?: string;
  contact_id?: string;
  title?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  currency?: string;
  notes?: string;
  items?: EstimateItemDraft[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const searchParam = url.searchParams.get("search");

  const supabase = await createClient();
  let query = supabase
    .from("acct_estimates")
    .select("id, org_id, estimate_number, contact_id, title, issue_date, expiry_date, status, subtotal, tax_total, total, currency, notes, created_at")
    .eq("org_id", guard.context.organizationId);

  if (statusParam) query = query.eq("status", statusParam);
  if (searchParam) query = query.ilike("estimate_number", `%${searchParam}%`);

  const { data: estimateRows, error: estimateError } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (estimateError) {
    return NextResponse.json({ error: estimateError.message }, { status: 500 });
  }

  const estimateIds = (estimateRows ?? []).map((row) => row.id);
  const { data: itemRows, error: itemError } = estimateIds.length
    ? await supabase
        .from("acct_estimate_items")
        .select("id, estimate_id, description, quantity, unit_price, tax_rate, amount")
        .in("estimate_id", estimateIds)
    : { data: [], error: null };

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const itemMap = new Map<string, unknown[]>();
  (itemRows ?? []).forEach((item) => {
    const list = itemMap.get(item.estimate_id) ?? [];
    list.push(item);
    itemMap.set(item.estimate_id, list);
  });

  return NextResponse.json({
    contract: "accounting.estimates.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    estimates: (estimateRows ?? []).map((est) => ({ ...est, items: itemMap.get(est.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as EstimateDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const estimateNumber = body.estimate_number?.trim();
  const contactId = body.contact_id?.trim();
  const title = body.title?.trim();
  const issueDate = body.issue_date ?? new Date().toISOString().slice(0, 10);
  const expiryDate = body.expiry_date ?? null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!estimateNumber || !contactId || !title || items.length === 0) {
    return NextResponse.json(
      { error: "estimate_number, contact_id, title, and at least one item are required." },
      { status: 400 },
    );
  }

  let subTotal = 0;
  let taxTotal = 0;
  const normalizedItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    amount: number;
  }> = [];

  for (const item of items) {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const taxRate = Number(item.tax_rate ?? 0);

    if (!item.description?.trim() || quantity <= 0 || unitPrice < 0 || taxRate < 0) {
      return NextResponse.json(
        { error: "Each item needs description, quantity > 0, unit_price >= 0, tax_rate >= 0." },
        { status: 400 },
      );
    }

    const amount = round2(quantity * unitPrice);
    const itemTax = round2((amount * taxRate) / 100);
    subTotal += amount;
    taxTotal += itemTax;

    normalizedItems.push({
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      amount,
    });
  }

  const total = round2(subTotal + taxTotal);

  const supabase = await createClient();

  const { data: estimateRow, error: estimateError } = await supabase
    .from("acct_estimates")
    .insert({
      org_id: guard.context.organizationId,
      estimate_number: estimateNumber,
      contact_id: contactId,
      title,
      issue_date: issueDate,
      expiry_date: expiryDate,
      status: body.status ?? "draft",
      subtotal: round2(subTotal),
      tax_total: round2(taxTotal),
      total,
      currency: body.currency?.trim() || "USD",
      notes: body.notes?.trim() || null,
      created_by: guard.context.userId,
    })
    .select("id, estimate_number, total, status")
    .single();

  if (estimateError || !estimateRow) {
    const conflict = estimateError?.code === "23505";
    return NextResponse.json(
      { error: estimateError?.message ?? "Estimate create failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  const itemPayload = normalizedItems.map((item) => ({
    estimate_id: estimateRow.id,
    ...item,
  }));

  const { error: itemInsertError } = await supabase.from("acct_estimate_items").insert(itemPayload);
  if (itemInsertError) {
    await supabase.from("acct_estimates").delete().eq("id", estimateRow.id);
    return NextResponse.json({ error: itemInsertError.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "estimate.created",
    tableName: "acct_estimates",
    recordId: estimateRow.id,
    newValues: { estimate: estimateRow, items: itemPayload },
  });

  return NextResponse.json(
    {
      contract: "accounting.estimates.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      estimate_id: estimateRow.id,
      total,
      tax_total: round2(taxTotal),
      emitted_events: ["accounting.estimate.created"],
    },
    { status: 201 },
  );
}
