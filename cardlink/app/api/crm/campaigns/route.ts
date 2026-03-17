import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_campaigns")
    .select("id, name, type, status, budget, spent, sent, opened, clicked, converted, start_date, end_date, notes, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const campaigns = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    description: row.notes,
    budget: Number(row.budget),
    start_date: row.start_date,
    end_date: row.end_date,
    sent_count: row.sent ?? 0,
    open_count: row.opened ?? 0,
    click_count: row.clicked ?? 0,
    created_at: row.created_at,
  }));

  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_campaigns")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      type: body.type ?? "email",
      status: body.status ?? "draft",
      budget: body.budget ?? 0,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      notes: body.description ?? null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
