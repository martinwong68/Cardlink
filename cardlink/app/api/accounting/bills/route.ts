import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BillItemDraft = {
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
  account_id?: string;
};

type BillDraft = {
  org_id?: string;
  bill_number?: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_email?: string;
  issue_date?: string;
  due_date?: string;
  status?: string;
  currency?: string;
  payment_terms?: string;
  notes?: string;
  reference?: string;
  items?: BillItemDraft[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data: billRows, error: billError } = await supabase
    .from("vendor_bills")
    .select("id, org_id, bill_number, vendor_id, vendor_name, vendor_email, issue_date, due_date, status, subtotal, tax, total, amount_paid, balance_due, currency, payment_terms, notes, reference, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (billError) {
    return NextResponse.json({ error: billError.message }, { status: 500 });
  }

  const billIds = (billRows ?? []).map((row) => row.id);
  const { data: itemRows, error: itemError } = billIds.length
    ? await supabase
        .from("vendor_bill_items")
        .select("id, bill_id, description, quantity, unit_price, tax_rate, amount, account_id")
        .in("bill_id", billIds)
    : { data: [], error: null };

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const itemMap = new Map<string, unknown[]>();
  (itemRows ?? []).forEach((item) => {
    const list = itemMap.get(item.bill_id) ?? [];
    list.push(item);
    itemMap.set(item.bill_id, list);
  });

  return NextResponse.json({
    contract: "accounting.bills.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    bills: (billRows ?? []).map((bill) => ({ ...bill, items: itemMap.get(bill.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BillDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const billNumber = body.bill_number?.trim();
  const vendorName = body.vendor_name?.trim();
  const issueDate = body.issue_date ?? new Date().toISOString().slice(0, 10);
  const dueDate = body.due_date ?? issueDate;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!billNumber || !vendorName || items.length === 0) {
    return NextResponse.json(
      { error: "bill_number, vendor_name, and at least one item are required." },
      { status: 400 }
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
    account_id: string | null;
  }> = [];

  for (const item of items) {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const taxRate = Number(item.tax_rate ?? 0);

    if (!item.description?.trim() || quantity <= 0 || unitPrice < 0 || taxRate < 0) {
      return NextResponse.json(
        { error: "Each bill item needs description, quantity > 0, unit_price >= 0, tax_rate >= 0." },
        { status: 400 }
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
      account_id: item.account_id?.trim() || null,
    });
  }

  const total = round2(subTotal + taxTotal);

  const supabase = await createClient();

  const { data: billRow, error: billError } = await supabase
    .from("vendor_bills")
    .insert({
      org_id: guard.context.organizationId,
      bill_number: billNumber,
      vendor_id: body.vendor_id?.trim() || null,
      vendor_name: vendorName,
      vendor_email: body.vendor_email?.trim() || null,
      issue_date: issueDate,
      due_date: dueDate,
      status: body.status ?? "draft",
      subtotal: round2(subTotal),
      tax: round2(taxTotal),
      total,
      amount_paid: 0,
      balance_due: total,
      currency: body.currency?.trim() || "USD",
      payment_terms: body.payment_terms?.trim() || null,
      notes: body.notes?.trim() || null,
      reference: body.reference?.trim() || null,
      created_by: guard.context.userId,
    })
    .select("id, bill_number, total, status")
    .single();

  if (billError || !billRow) {
    const conflict = billError?.code === "23505";
    return NextResponse.json(
      { error: billError?.message ?? "Bill create failed." },
      { status: conflict ? 409 : 400 }
    );
  }

  const itemPayload = normalizedItems.map((item) => ({
    bill_id: billRow.id,
    ...item,
  }));

  const { error: itemInsertError } = await supabase.from("vendor_bill_items").insert(itemPayload);
  if (itemInsertError) {
    await supabase.from("vendor_bills").delete().eq("id", billRow.id);
    return NextResponse.json({ error: itemInsertError.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bill.created",
    tableName: "vendor_bills",
    recordId: billRow.id,
    newValues: { bill: billRow, items: itemPayload },
  });

  return NextResponse.json(
    {
      contract: "accounting.bills.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      bill_id: billRow.id,
      total,
      tax: round2(taxTotal),
      emitted_events: ["accounting.bill.created"],
    },
    { status: 201 }
  );
}
