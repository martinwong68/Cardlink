import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  if (!employeeId) return NextResponse.json({ error: "employee_id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hr_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;
  const body = await request.json();

  if (!body.employee_id || !body.name?.trim() || !body.doc_type || !body.file_url) {
    return NextResponse.json({ error: "employee_id, name, doc_type, and file_url are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("hr_documents")
    .insert({
      company_id: companyId,
      employee_id: body.employee_id,
      name: body.name.trim(),
      doc_type: body.doc_type,
      file_url: body.file_url,
      file_size: body.file_size || null,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("hr_documents")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
