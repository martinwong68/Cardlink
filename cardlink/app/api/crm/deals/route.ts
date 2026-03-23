import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const STAGE_DB_TO_FE: Record<string, string> = {
  discovery: "qualification",
  proposal: "proposal",
  negotiation: "negotiation",
  closed_won: "won",
  closed_lost: "lost",
};

const STAGE_FE_TO_DB: Record<string, string> = {
  qualification: "discovery",
  proposal: "proposal",
  negotiation: "negotiation",
  closing: "negotiation",
  won: "closed_won",
  lost: "closed_lost",
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_deals")
    .select("id, title, value, stage, probability, expected_close_date, notes, contact_id, contact_name, lead_id, lost_reason, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deals = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    value: Number(row.value),
    stage: STAGE_DB_TO_FE[row.stage] ?? row.stage,
    probability: row.probability,
    expected_close_date: row.expected_close_date,
    notes: row.notes,
    contact_id: row.contact_id,
    contact_name: row.contact_name,
    lead_id: row.lead_id,
    lost_reason: row.lost_reason,
    created_at: row.created_at,
  }));

  return NextResponse.json({ deals });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const dbStage = STAGE_FE_TO_DB[body.stage] ?? "discovery";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      company_id: guard.context.activeCompanyId,
      title,
      value: body.value ?? 0,
      stage: dbStage,
      probability: body.probability ?? 0,
      expected_close_date: body.expected_close_date ?? null,
      notes: body.notes ?? null,
      contact_id: body.contact_id ?? null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
