import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("crm_import_jobs")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "crm.import.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    import_jobs: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const importType = body.import_type?.trim();
  const fileName = body.file_name?.trim();

  if (!importType) {
    return NextResponse.json({ error: "import_type is required." }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json({ error: "file_name is required." }, { status: 400 });
  }
  if (body.total_rows == null || body.total_rows < 0) {
    return NextResponse.json({ error: "total_rows is required and must be non-negative." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_import_jobs")
    .insert({
      company_id: guard.context.activeCompanyId,
      import_type: importType,
      file_name: fileName,
      total_rows: body.total_rows,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "crm.import.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    import_job_id: data.id,
  }, { status: 201 });
}
