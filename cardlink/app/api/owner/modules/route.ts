import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_modules")
    .select("id, module_name, is_enabled, enabled_at, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("module_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { module?: string; is_enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const moduleName = body.module?.trim();
  const isEnabled = body.is_enabled ?? false;

  const VALID_MODULES = new Set([
    "accounting", "pos", "procurement", "crm", "inventory",
    "cards", "hr", "booking", "store", "client", "membership",
  ]);

  if (!moduleName || !VALID_MODULES.has(moduleName)) {
    return NextResponse.json({ error: "Invalid module name." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  /* Check if module row already exists */
  const { data: existing } = await supabase
    .from("company_modules")
    .select("id")
    .eq("company_id", companyId)
    .eq("module_name", moduleName)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("company_modules")
      .update({
        is_enabled: isEnabled,
        enabled_at: isEnabled ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { error: insertError } = await supabase
      .from("company_modules")
      .insert({
        company_id: companyId,
        module_name: moduleName,
        is_enabled: isEnabled,
        enabled_at: isEnabled ? new Date().toISOString() : null,
        enabled_by: guard.context.user.id,
      });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, module: moduleName, is_enabled: isEnabled });
}
