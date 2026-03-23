import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BillUpdatePayload = {
  org_id?: string;
  vendor_name?: string;
  vendor_email?: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  reference?: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ billId: string }> }
) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const billId = params.billId;

  const supabase = await createClient();
  const { data: bill, error } = await supabase
    .from("vendor_bills")
    .select("*")
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  const { data: items } = await supabase
    .from("vendor_bill_items")
    .select("*")
    .eq("bill_id", billId);

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("related_type", "vendor_bill")
    .eq("related_id", billId)
    .order("payment_date", { ascending: false });

  return NextResponse.json({
    contract: "accounting.bills.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    bill: { ...bill, items: items ?? [], payments: payments ?? [] },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ billId: string }> }
) {
  const body = (await request.json()) as BillUpdatePayload;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const billId = params.billId;

  const supabase = await createClient();
  const { data: beforeRow } = await supabase
    .from("vendor_bills")
    .select("*")
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!beforeRow) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.vendor_name?.trim()) updates.vendor_name = body.vendor_name.trim();
  if (body.vendor_email !== undefined) updates.vendor_email = body.vendor_email?.trim() || null;
  if (body.due_date) updates.due_date = body.due_date;
  if (body.payment_terms !== undefined) updates.payment_terms = body.payment_terms?.trim() || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.reference !== undefined) updates.reference = body.reference?.trim() || null;

  const { data, error } = await supabase
    .from("vendor_bills")
    .update(updates)
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .select("id, bill_number, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bill.updated",
    tableName: "vendor_bills",
    recordId: billId,
    oldValues: beforeRow,
    newValues: updates,
  });

  return NextResponse.json({
    contract: "accounting.bills.v1",
    status: "updated",
    organization_id: guard.context.organizationId,
    bill_id: billId,
    emitted_events: ["accounting.bill.updated"],
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ billId: string }> }
) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const billId = params.billId;

  const supabase = await createClient();
  const { data: bill } = await supabase
    .from("vendor_bills")
    .select("id, status, bill_number")
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  if (bill.status !== "draft") {
    return NextResponse.json({ error: "Only draft bills can be deleted." }, { status: 400 });
  }

  await supabase.from("vendor_bill_items").delete().eq("bill_id", billId);
  await supabase.from("vendor_bills").delete().eq("id", billId);

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bill.deleted",
    tableName: "vendor_bills",
    recordId: billId,
    oldValues: bill,
  });

  return NextResponse.json({
    contract: "accounting.bills.v1",
    status: "deleted",
    organization_id: guard.context.organizationId,
    bill_id: billId,
    emitted_events: ["accounting.bill.deleted"],
  });
}
