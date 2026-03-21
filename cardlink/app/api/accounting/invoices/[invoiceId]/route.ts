import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type InvoiceItemDraft = {
  id?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
};

type InvoiceUpdate = {
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

/* ── GET single invoice with items ── */
export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const invoiceId = params.invoiceId;

  const supabase = await createClient();
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, org_id, invoice_number, client_name, client_email, issue_date, due_date, status, total, tax, currency, notes, created_at")
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, invoice_id, description, quantity, unit_price, tax_rate, amount")
    .eq("invoice_id", invoiceId);

  return NextResponse.json({
    contract: "accounting.invoices.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    invoice: { ...invoice, items: items ?? [] },
  });
}

/* ── PATCH — full invoice edit ── */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const body = (await request.json()) as InvoiceUpdate;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const invoiceId = params.invoiceId;

  const supabase = await createClient();

  /* Verify invoice exists and belongs to org */
  const { data: existing, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, status, invoice_number, client_name, total, tax")
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  /* Build header update */
  const headerUpdate: Record<string, unknown> = {};
  if (body.invoice_number?.trim()) headerUpdate.invoice_number = body.invoice_number.trim();
  if (body.client_name?.trim()) headerUpdate.client_name = body.client_name.trim();
  if (body.client_email !== undefined) headerUpdate.client_email = body.client_email?.trim() || null;
  if (body.issue_date) headerUpdate.issue_date = body.issue_date;
  if (body.due_date) headerUpdate.due_date = body.due_date;
  if (body.status) headerUpdate.status = body.status;
  if (body.currency?.trim()) headerUpdate.currency = body.currency.trim();
  if (body.notes !== undefined) headerUpdate.notes = body.notes?.trim() || null;

  /* Recalculate totals if items provided */
  let newItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    amount: number;
  }> | null = null;

  if (Array.isArray(body.items) && body.items.length > 0) {
    let subTotal = 0;
    let taxTotal = 0;
    newItems = [];

    for (const item of body.items) {
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

      newItems.push({
        description: item.description.trim(),
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        amount,
      });
    }

    headerUpdate.total = round2(subTotal + taxTotal);
    headerUpdate.tax = round2(taxTotal);
  }

  /* Update invoice header */
  if (Object.keys(headerUpdate).length > 0) {
    const { error: updateErr } = await supabase
      .from("invoices")
      .update(headerUpdate)
      .eq("id", invoiceId)
      .eq("org_id", guard.context.organizationId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
  }

  /* Replace items if provided */
  if (newItems) {
    await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
    const itemPayload = newItems.map((item) => ({ invoice_id: invoiceId, ...item }));
    const { error: itemErr } = await supabase.from("invoice_items").insert(itemPayload);
    if (itemErr) {
      return NextResponse.json({ error: itemErr.message }, { status: 400 });
    }
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "invoice.updated",
    tableName: "invoices",
    recordId: invoiceId,
    oldValues: existing,
    newValues: headerUpdate,
  });

  return NextResponse.json({
    contract: "accounting.invoices.v1",
    status: "updated",
    organization_id: guard.context.organizationId,
    invoice_id: invoiceId,
    emitted_events: ["accounting.invoice.updated"],
  });
}

/* ── DELETE — remove invoice ── */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const invoiceId = params.invoiceId;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "invoice.deleted",
    tableName: "invoices",
    recordId: invoiceId,
    oldValues: existing,
  });

  return NextResponse.json({
    contract: "accounting.invoices.v1",
    status: "deleted",
    organization_id: guard.context.organizationId,
    invoice_id: invoiceId,
    emitted_events: ["accounting.invoice.deleted"],
  });
}
