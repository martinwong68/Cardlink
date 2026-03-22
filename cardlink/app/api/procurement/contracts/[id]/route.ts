import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "title", "supplier_id", "contract_number", "status",
    "start_date", "end_date", "value", "terms", "notes",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (body.status) {
    const validStatuses = ["draft", "active", "expired", "terminated"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_contracts")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Contract not found." },
      { status: error ? 500 : 404 },
    );
  }

  return NextResponse.json({
    contract: "procurement.contracts.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    contract_id: data.id,
    contract_status: data.status,
    emitted_events: [`procurement.contract.${data.status}`],
  });
}
