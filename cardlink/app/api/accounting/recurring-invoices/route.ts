import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type RecurringInvoiceDraft = {
  org_id?: string;
  contact_id?: string;
  title?: string;
  frequency?: string;
  next_issue_date?: string;
  end_date?: string;
  currency?: string;
  notes?: string;
  items?: unknown;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const isActiveParam = url.searchParams.get("is_active");

  const supabase = await createClient();
  let query = supabase
    .from("acct_recurring_invoices")
    .select("id, org_id, contact_id, title, frequency, next_issue_date, end_date, is_active, items, currency, notes, created_at")
    .eq("org_id", guard.context.organizationId);

  if (isActiveParam === "true") query = query.eq("is_active", true);
  else if (isActiveParam === "false") query = query.eq("is_active", false);

  const { data, error } = await query
    .order("next_issue_date", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "accounting.recurring_invoices.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    recurring_invoices: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as RecurringInvoiceDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const contactId = body.contact_id?.trim();
  const title = body.title?.trim();
  const frequency = body.frequency?.trim();
  const nextIssueDate = body.next_issue_date?.trim();

  if (!contactId || !title || !frequency || !nextIssueDate) {
    return NextResponse.json(
      { error: "contact_id, title, frequency, and next_issue_date are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("acct_recurring_invoices")
    .insert({
      org_id: guard.context.organizationId,
      contact_id: contactId,
      title,
      frequency,
      next_issue_date: nextIssueDate,
      end_date: body.end_date?.trim() || null,
      items: body.items ?? null,
      currency: body.currency?.trim() || "USD",
      notes: body.notes?.trim() || null,
      created_by: guard.context.userId,
    })
    .select("id, title, frequency, next_issue_date")
    .single();

  if (error || !data) {
    const conflict = error?.code === "23505";
    return NextResponse.json(
      { error: error?.message ?? "Recurring invoice create failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "recurring_invoice.created",
    tableName: "acct_recurring_invoices",
    recordId: data.id,
    newValues: data,
  });

  return NextResponse.json(
    {
      contract: "accounting.recurring_invoices.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      recurring_invoice_id: data.id,
      emitted_events: ["accounting.recurring_invoice.created"],
    },
    { status: 201 },
  );
}
