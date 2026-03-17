import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type ProductDraft = {
  company_id?: string;
  companyId?: string;
  sku?: string;
  name?: string;
  unit?: string;
  is_active?: boolean;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_products")
    .select("id, company_id, sku, name, unit, is_active, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "inventory.products.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    products: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  const sku = body.sku?.trim();
  const name = body.name?.trim();
  const unit = body.unit?.trim() || "pcs";
  if (!sku || !name) {
    return NextResponse.json(
      { error: "sku and name are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_products")
    .insert({
      company_id: guard.context.activeCompanyId,
      sku,
      name,
      unit,
      is_active: body.is_active ?? true,
    })
    .select("id, company_id")
    .single();

  if (error) {
    const conflict = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.products.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    product_id: data.id,
  }, { status: 201 });
}
