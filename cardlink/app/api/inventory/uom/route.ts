import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_units_of_measure")
    .select("*, conversions:inv_uom_conversions(*)")
    .eq("company_id", guard.context.organizationId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.uom.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    units_of_measure: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = body.name?.trim();
  const abbreviation = body.abbreviation?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!abbreviation) {
    return NextResponse.json({ error: "abbreviation is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_units_of_measure")
    .insert({
      company_id: guard.context.organizationId,
      name,
      abbreviation,
      category: body.category?.trim() || null,
      is_base: body.is_base ?? false,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.uom.v1",
    status: "created",
    organization_id: guard.context.organizationId,
    unit_of_measure_id: data.id,
  }, { status: 201 });
}
