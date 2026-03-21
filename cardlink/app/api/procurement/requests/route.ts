import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type RequestDraft = {
  company_id?: string;
  pr_number?: string;
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  total_estimated?: number;
  notes?: string | null;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_purchase_requests")
    .select("id, pr_number, title, description, status, priority, total_estimated, requested_by, approved_by, approved_at, notes, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "procurement.requests.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    requests: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestDraft;
  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId: body.company_id?.trim(),
  });
  if (!guard.ok) return guard.response;

  const title = body.title?.trim();
  const prNumber = body.pr_number?.trim();

  if (!title || !prNumber) {
    return NextResponse.json(
      { error: "title and pr_number are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_purchase_requests")
    .insert({
      company_id: guard.context.activeCompanyId,
      pr_number: prNumber,
      title,
      description: body.description?.trim() || null,
      status: body.status ?? "draft",
      priority: body.priority ?? "normal",
      total_estimated: Number(body.total_estimated) || 0,
      requested_by: guard.context.user.id,
      notes: body.notes?.trim() || null,
    })
    .select("id, pr_number, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "procurement.requests.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      request_id: data.id,
      emitted_events: ["procurement.request.created"],
    },
    { status: 201 },
  );
}
