import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type InvoiceItemDraft = {
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
};

type InvoiceDraft = {
  org_id?: string;
  invoice_number?: string;
  client_name?: string;
  client_email?: string;
  issue_date?: string;
  due_date?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  currency?: string;
  notes?: string;
  items?: InvoiceItemDraft[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, org_id, invoice_number, client_name, client_email, issue_date, due_date, status, total, tax, currency, notes, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  const invoiceIds = (invoiceRows ?? []).map((row) => row.id);
  const { data: itemRows, error: itemError } = invoiceIds.length
    ? await supabase
        .from("invoice_items")
        .select("id, invoice_id, description, quantity, unit_price, tax_rate, amount")
        .in("invoice_id", invoiceIds)
    : { data: [], error: null };

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const itemMap = new Map<string, unknown[]>();
  (itemRows ?? []).forEach((item) => {
    const list = itemMap.get(item.invoice_id) ?? [];
    list.push(item);
    itemMap.set(item.invoice_id, list);
  });

  return NextResponse.json({
    contract: "accounting.invoices.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    invoices: (invoiceRows ?? []).map((invoice) => ({ ...invoice, items: itemMap.get(invoice.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as InvoiceDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const invoiceNumber = body.invoice_number?.trim();
  const clientName = body.client_name?.trim();
  const issueDate = body.issue_date ?? new Date().toISOString().slice(0, 10);
  const dueDate = body.due_date ?? issueDate;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!invoiceNumber || !clientName || items.length === 0) {
    return NextResponse.json(
      { error: "invoice_number, client_name, and at least one item are required." },
      { status: 400 }
    );
  }

  let subTotal = 0;
  let taxTotal = 0;
  const normalizedItems = [] as Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    amount: number;
  }>;

  for (const item of items) {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const taxRate = Number(item.tax_rate ?? 0);

    if (!item.description?.trim() || quantity <= 0 || unitPrice < 0 || taxRate < 0) {
      return NextResponse.json(
        { error: "Each invoice item needs description, quantity > 0, unit_price >= 0, tax_rate >= 0." },
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
    });
  }

  const total = round2(subTotal + taxTotal);

  const supabase = await createClient();

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      org_id: guard.context.organizationId,
      invoice_number: invoiceNumber,
      client_name: clientName,
      client_email: body.client_email?.trim() || null,
      issue_date: issueDate,
      due_date: dueDate,
      status: body.status ?? "draft",
      total,
      tax: round2(taxTotal),
      currency: body.currency?.trim() || "USD",
      notes: body.notes?.trim() || null,
    })
    .select("id, invoice_number, total, status")
    .single();

  if (invoiceError || !invoiceRow) {
    const conflict = invoiceError?.code === "23505";
    return NextResponse.json({ error: invoiceError?.message ?? "Invoice create failed." }, { status: conflict ? 409 : 400 });
  }

  const itemPayload = normalizedItems.map((item) => ({
    invoice_id: invoiceRow.id,
    ...item,
  }));

  const { error: itemError } = await supabase.from("invoice_items").insert(itemPayload);
  if (itemError) {
    await supabase.from("invoices").delete().eq("id", invoiceRow.id);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "invoice.created",
    tableName: "invoices",
    recordId: invoiceRow.id,
    newValues: {
      invoice: invoiceRow,
      items: itemPayload,
    },
  });

  return NextResponse.json(
    {
      contract: "accounting.invoices.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      invoice_id: invoiceRow.id,
      total,
      tax: round2(taxTotal),
      emitted_events: ["accounting.invoice.created"],
    },
    { status: 201 }
  );
}
