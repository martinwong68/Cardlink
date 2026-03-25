import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const VALID_MODULES = ["procurement", "hr", "accounting", "inventory"];
const VALID_ROLES = ["owner", "admin", "manager"];

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_settings")
    .select("id, module, auto_approve, approval_threshold, approver_role, require_notes, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("module");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: {
    module?: string;
    auto_approve?: boolean;
    approval_threshold?: number;
    approver_role?: string;
    require_notes?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const moduleName = body.module?.trim();
  if (!moduleName || !VALID_MODULES.includes(moduleName)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 });
  }

  const approverRole = body.approver_role?.trim() ?? "owner";
  if (!VALID_ROLES.includes(approverRole)) {
    return NextResponse.json({ error: "Invalid approver role." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data: existing } = await supabase
    .from("approval_settings")
    .select("id")
    .eq("company_id", companyId)
    .eq("module", moduleName)
    .maybeSingle();

  const payload = {
    auto_approve: body.auto_approve ?? false,
    approval_threshold: body.approval_threshold ?? 0,
    approver_role: approverRole,
    require_notes: body.require_notes ?? false,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("approval_settings")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { error: insertError } = await supabase
      .from("approval_settings")
      .insert({
        company_id: companyId,
        module: moduleName,
        ...payload,
      });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, module: moduleName });
}
