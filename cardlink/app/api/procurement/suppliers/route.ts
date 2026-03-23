import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type SupplierDraft = {
  company_id?: string;
  companyId?: string;
  name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  payment_terms?: string;
  currency?: string;
  category?: string;
  tax_id?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_suppliers")
    .select("id, company_id, name, contact_name, contact_phone, email, address, city, country, payment_terms, currency, category, tax_id, website, notes, is_active, rating, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "procurement.suppliers.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    suppliers: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as SupplierDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "name is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proc_suppliers")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      contact_name: body.contact_name?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      payment_terms: body.payment_terms || "net_30",
      currency: body.currency?.trim() || "USD",
      category: body.category?.trim() || null,
      tax_id: body.tax_id?.trim() || null,
      website: body.website?.trim() || null,
      notes: body.notes?.trim() || null,
      is_active: body.is_active !== false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "procurement.suppliers.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      supplier_id: data.id,
    },
    { status: 201 }
  );
}
