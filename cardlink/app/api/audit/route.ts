import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const module = url.searchParams.get("module")?.trim() || null;
  const tableName = url.searchParams.get("table_name")?.trim() || null;
  const recordId = url.searchParams.get("record_id")?.trim() || null;
  const action = url.searchParams.get("action")?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (module) query = query.eq("module", module);
  if (tableName) query = query.eq("table_name", tableName);
  if (recordId) query = query.eq("record_id", recordId);
  if (action) query = query.eq("action", action);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "audit.log.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    entries: data ?? [],
  });
}
