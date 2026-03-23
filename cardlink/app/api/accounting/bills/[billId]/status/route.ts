import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type BillStatusPayload = {
  org_id?: string;
  status?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ billId: string }> }
) {
  const body = (await request.json()) as BillStatusPayload;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const status = body.status?.trim().toLowerCase();
  const validStatuses = ["draft", "approved", "partially_paid", "paid", "overdue", "voided"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const params = await context.params;
  const billId = params.billId;

  const supabase = await createClient();
  const { data: beforeRow } = await supabase
    .from("vendor_bills")
    .select("id, status, total, bill_number, amount_paid, balance_due")
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!beforeRow) {
    return NextResponse.json({ error: "Bill not found in organization scope." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("vendor_bills")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", billId)
    .eq("org_id", guard.context.organizationId)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Bill status update failed." }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "bill.status.updated",
    tableName: "vendor_bills",
    recordId: billId,
    oldValues: beforeRow,
    newValues: data,
  });

  return NextResponse.json({
    contract: "accounting.bills.v1",
    status: "updated",
    organization_id: guard.context.organizationId,
    bill_id: billId,
    bill_status: data.status,
    emitted_events: ["accounting.bill.status.changed"],
  });
}
