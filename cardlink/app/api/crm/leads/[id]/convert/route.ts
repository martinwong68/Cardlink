import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * POST /api/crm/leads/[id]/convert
 * Convert a lead into a deal + contact atomically via RPC.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_lead_to_deal", {
    p_lead_id: id,
    p_company_id: guard.context.activeCompanyId,
    p_user_id: guard.context.user.id,
    p_deal_title: body.deal_title ?? null,
    p_deal_value: body.deal_value ?? 0,
    p_deal_stage: body.deal_stage ?? "discovery",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as Record<string, unknown>;
  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
