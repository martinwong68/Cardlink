import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_tax_config")
    .select("id, name, rate, region, is_default, is_active, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "pos.tax_config.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    tax_configs: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = (body.name ?? "").trim();
  const rate = Number(body.rate ?? -1);

  if (!name || rate < 0 || rate > 1) {
    return NextResponse.json(
      { error: "name required, rate must be 0..1 (e.g. 0.08 for 8%)" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // If setting as default, clear other defaults
  if (body.is_default) {
    await supabase
      .from("pos_tax_config")
      .update({ is_default: false })
      .eq("company_id", guard.context.activeCompanyId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("pos_tax_config")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      rate,
      region: body.region?.trim() || null,
      is_default: body.is_default ?? false,
      is_active: true,
    })
    .select("id, name, rate, region, is_default, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    {
      contract: "pos.tax_config.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      tax_config: data,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_tax_config")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "deleted" });
}
