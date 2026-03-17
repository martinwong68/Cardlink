import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  // Audit log is not stored in a separate table yet — return empty for now.
  // Future: query an audit_log table or Supabase auth.audit_log_entries.
  return NextResponse.json({ entries: [] });
}
