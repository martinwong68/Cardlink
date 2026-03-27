import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();

  // Clear existing default
  await supabase
    .from("pos_tax_config")
    .update({ is_default: false })
    .eq("company_id", guard.context.activeCompanyId)
    .eq("is_default", true);

  // Set new default
  const { error } = await supabase
    .from("pos_tax_config")
    .update({ is_default: true })
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ status: "updated" });
}
