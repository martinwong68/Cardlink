import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type StatusUpdatePayload = {
  org_id?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const body = (await request.json()) as StatusUpdatePayload;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const status = body.status?.trim().toLowerCase();
  if (!status || !["draft", "sent", "paid", "overdue"].includes(status)) {
    return NextResponse.json({ error: "status must be draft/sent/paid/overdue." }, { status: 400 });
  }

  const params = await context.params;
  const invoiceId = params.invoiceId;

  const supabase = await createClient();
  const { data: beforeRow } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!beforeRow) {
    return NextResponse.json({ error: "Invoice not found in organization scope." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("org_id", guard.context.organizationId)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Invoice status update failed." }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "invoice.status.updated",
    tableName: "invoices",
    recordId: invoiceId,
    oldValues: beforeRow,
    newValues: data,
  });

  return NextResponse.json({
    contract: "accounting.invoices.v1",
    status: "updated",
    organization_id: guard.context.organizationId,
    invoice_id: invoiceId,
    invoice_status: data.status,
    emitted_events: ["accounting.invoice.status.changed"],
  });
}
