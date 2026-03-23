import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id")?.trim() || null;
  const status = url.searchParams.get("status")?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("store_shipments")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (orderId) query = query.eq("order_id", orderId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "store.shipments.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    shipments: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const orderId = body.order_id?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "order_id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_shipments")
    .insert({
      company_id: guard.context.activeCompanyId,
      order_id: orderId,
      status: "pending",
      carrier: body.carrier?.trim() || null,
      tracking_number: body.tracking_number?.trim() || null,
      tracking_url: body.tracking_url?.trim() || null,
      estimated_delivery: body.estimated_delivery || null,
      shipping_cost: body.shipping_cost ?? null,
      weight: body.weight ?? null,
      dimensions: body.dimensions ?? null,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  return NextResponse.json({
    contract: "store.shipments.v1",
    status: "created",
    company_id: guard.context.activeCompanyId,
    shipment_id: data.id,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const id = body.id?.trim();
  const status = body.status?.trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 });
  }

  const update: Record<string, unknown> = { status };

  if (status === "shipped") {
    update.shipped_at = body.shipped_at || new Date().toISOString();
  }
  if (status === "delivered") {
    update.delivered_at = body.delivered_at || new Date().toISOString();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_shipments")
    .update(update)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!data) {
    return NextResponse.json(
      { error: "Shipment not found in active company scope." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    contract: "store.shipments.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    shipment_id: data.id,
  });
}
