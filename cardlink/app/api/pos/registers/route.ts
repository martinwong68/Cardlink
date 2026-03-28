import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_registers")
    .select("id, name")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registers: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_registers")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      location: body.location?.trim() || null,
      is_active: true,
    })
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ register: data }, { status: 201 });
}
