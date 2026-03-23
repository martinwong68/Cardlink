import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "name", "contact_name", "contact_phone", "email",
    "address", "city", "country", "payment_terms", "currency",
    "category", "tax_id", "website", "notes", "is_active", "rating",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_suppliers")
    .update(updates)
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, name")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Supplier not found." },
      { status: error ? 500 : 404 },
    );
  }

  return NextResponse.json({
    contract: "procurement.suppliers.v1",
    status: "updated",
    company_id: guard.context.activeCompanyId,
    supplier_id: data.id,
  });
}
