import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type ContractDraft = {
  company_id?: string;
  companyId?: string;
  supplier_id?: string | null;
  title?: string;
  contract_number?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  value?: number;
  terms?: string | null;
  notes?: string | null;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_contracts")
    .select("id, company_id, supplier_id, title, contract_number, status, start_date, end_date, value, terms, notes, created_by, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "procurement.contracts.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    contracts: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ContractDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) return guard.response;

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_contracts")
    .insert({
      company_id: guard.context.activeCompanyId,
      supplier_id: body.supplier_id || null,
      title,
      contract_number: body.contract_number?.trim() || null,
      status: body.status ?? "draft",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      value: Number(body.value) || 0,
      terms: body.terms?.trim() || null,
      notes: body.notes?.trim() || null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "procurement.contracts.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      contract_id: data.id,
      emitted_events: ["procurement.contract.created"],
    },
    { status: 201 },
  );
}
