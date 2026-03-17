import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_activities")
    .select("id, type, title, description, due_date, status, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activities = (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    is_completed: row.status === "completed",
    due_date: row.due_date,
    created_at: row.created_at,
  }));

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_activities")
    .insert({
      company_id: guard.context.activeCompanyId,
      type: body.type ?? "task",
      title,
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      status: body.is_completed ? "completed" : "pending",
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
