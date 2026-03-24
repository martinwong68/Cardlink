import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type CreditNoteItemDraft = {
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
};

type CreditNoteDraft = {
  org_id?: string;
  credit_note_number?: string;
  invoice_id?: string;
  contact_id?: string;
  issue_date?: string;
  reason?: string;
  status?: string;
  currency?: string;
  notes?: string;
  items?: CreditNoteItemDraft[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  const supabase = await createClient();
  let query = supabase
    .from("acct_credit_notes")
    .select("id, org_id, credit_note_number, invoice_id, contact_id, issue_date, reason, status, subtotal, tax_total, total, remaining, currency, notes, created_at")
    .eq("org_id", guard.context.organizationId);

  if (statusParam) query = query.eq("status", statusParam);

  const { data: creditNoteRows, error: creditNoteError } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (creditNoteError) {
    return NextResponse.json({ error: creditNoteError.message }, { status: 500 });
  }

  const creditNoteIds = (creditNoteRows ?? []).map((row) => row.id);
  const { data: itemRows, error: itemError } = creditNoteIds.length
    ? await supabase
        .from("acct_credit_note_items")
        .select("id, credit_note_id, description, quantity, unit_price, tax_rate, amount")
        .in("credit_note_id", creditNoteIds)
    : { data: [], error: null };

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const itemMap = new Map<string, unknown[]>();
  (itemRows ?? []).forEach((item) => {
    const list = itemMap.get(item.credit_note_id) ?? [];
    list.push(item);
    itemMap.set(item.credit_note_id, list);
  });

  return NextResponse.json({
    contract: "accounting.credit_notes.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    credit_notes: (creditNoteRows ?? []).map((cn) => ({ ...cn, items: itemMap.get(cn.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreditNoteDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const creditNoteNumber = body.credit_note_number?.trim();
  const contactId = body.contact_id?.trim();
  const issueDate = body.issue_date ?? new Date().toISOString().slice(0, 10);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!creditNoteNumber || !contactId || items.length === 0) {
    return NextResponse.json(
      { error: "credit_note_number, contact_id, and at least one item are required." },
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
  const remaining = total;

  const supabase = await createClient();

  const { data: creditNoteRow, error: creditNoteError } = await supabase
    .from("acct_credit_notes")
    .insert({
      org_id: guard.context.organizationId,
      credit_note_number: creditNoteNumber,
      invoice_id: body.invoice_id?.trim() || null,
      contact_id: contactId,
      issue_date: issueDate,
      reason: body.reason?.trim() || null,
      status: body.status ?? "draft",
      subtotal: round2(subTotal),
      tax_total: round2(taxTotal),
      total,
      remaining,
      currency: body.currency?.trim() || "USD",
      notes: body.notes?.trim() || null,
      created_by: guard.context.userId,
    })
    .select("id, credit_note_number, total, status")
    .single();

  if (creditNoteError || !creditNoteRow) {
    const conflict = creditNoteError?.code === "23505";
    return NextResponse.json(
      { error: creditNoteError?.message ?? "Credit note create failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  const itemPayload = normalizedItems.map((item) => ({
    credit_note_id: creditNoteRow.id,
    ...item,
  }));

  const { error: itemInsertError } = await supabase.from("acct_credit_note_items").insert(itemPayload);
  if (itemInsertError) {
    await supabase.from("acct_credit_notes").delete().eq("id", creditNoteRow.id);
    return NextResponse.json({ error: itemInsertError.message }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "credit_note.created",
    tableName: "acct_credit_notes",
    recordId: creditNoteRow.id,
    newValues: { credit_note: creditNoteRow, items: itemPayload },
  });

  return NextResponse.json(
    {
      contract: "accounting.credit_notes.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      credit_note_id: creditNoteRow.id,
      total,
      tax_total: round2(taxTotal),
      remaining,
      emitted_events: ["accounting.credit_note.created"],
    },
    { status: 201 },
  );
}
