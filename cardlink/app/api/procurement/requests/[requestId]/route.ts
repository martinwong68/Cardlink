import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type StatusPatch = {
  company_id?: string;
  status?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const body = (await request.json()) as StatusPatch;
  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId: body.company_id?.trim(),
  });
  if (!guard.ok) return guard.response;

  const status = body.status?.trim().toLowerCase();
  const allowed = ["draft", "pending", "approved", "rejected", "cancelled"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${allowed.join(", ")}` },
      { status: 400 },
    );
  }

  const params = await context.params;
  const requestId = params.requestId;

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = { status };
  if (status === "approved") {
    updatePayload.approved_by = guard.context.user.id;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("proc_purchase_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Request not found." },
      { status: error ? 400 : 404 },
    );
  }

  return NextResponse.json({
    contract: "procurement.requests.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    request_id: data.id,
    request_status: data.status,
    emitted_events: [`procurement.request.${status}`],
  });
}
