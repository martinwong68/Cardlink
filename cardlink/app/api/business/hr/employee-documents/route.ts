import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const documentType = searchParams.get("document_type");

  let query = supabase
    .from("hr_employee_documents")
    .select("*")
    .eq("company_id", companyId);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (documentType) query = query.eq("document_type", documentType);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok", documents: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  if (!body.employee_id || !body.document_type || !body.title?.trim())
    return NextResponse.json(
      { error: "employee_id, document_type, and title are required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("hr_employee_documents")
    .insert({
      company_id: companyId,
      employee_id: body.employee_id,
      document_type: body.document_type,
      title: body.title.trim(),
      file_url: body.file_url || null,
      file_size: body.file_size ?? null,
      expiry_date: body.expiry_date || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Duplicate document record" },
        { status: 409 },
      );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", document: data }, { status: 201 });
}
