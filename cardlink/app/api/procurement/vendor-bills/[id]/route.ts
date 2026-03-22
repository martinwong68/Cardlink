import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";
import { createVendorBillPaidJournalEntry } from "@/src/lib/cross-module-integration";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "status", "bill_date", "due_date", "subtotal",
    "tax_amount", "total_amount", "payment_terms", "notes",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (body.status) {
    const validStatuses = ["draft", "pending", "approved", "paid", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_vendor_bills")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, status, total_amount, bill_number, supplier_id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Vendor bill not found." },
      { status: error ? 500 : 404 },
    );
  }

  /* Cross-module: create accounting journal entry when bill is paid */
  if (body.status === "paid" && data.total_amount > 0) {
    void createVendorBillPaidJournalEntry(
      supabase,
      guard.context.activeCompanyId,
      guard.context.user.id,
      data.id,
      Number(data.total_amount),
      data.bill_number,
    );
  }

  return NextResponse.json({
    contract: "procurement.vendor_bills.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    bill_id: data.id,
    bill_status: data.status,
    emitted_events: [`procurement.bill.${data.status}`],
  });
}
