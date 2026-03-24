import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id")?.trim() || null;
  const isActive = url.searchParams.get("is_active");

  if (!productId) {
    return NextResponse.json({ error: "product_id query param is required." }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("inv_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "inventory.variants.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    product_id: productId,
    variants: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const productId = body.product_id?.trim();
  const variantName = body.variant_name?.trim();

  if (!productId) {
    return NextResponse.json({ error: "product_id is required." }, { status: 400 });
  }
  if (!variantName) {
    return NextResponse.json({ error: "variant_name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inv_product_variants")
    .insert({
      company_id: guard.context.organizationId,
      product_id: productId,
      variant_name: variantName,
      sku: body.sku?.trim() || null,
      barcode: body.barcode?.trim() || null,
      attributes: body.attributes ?? null,
      price_override: body.price_override ?? null,
      cost_override: body.cost_override ?? null,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "inventory.variants.v1",
    status: "created",
    organization_id: guard.context.organizationId,
    variant_id: data.id,
  }, { status: 201 });
}
