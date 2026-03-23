import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * POST /api/crm/contacts/import
 * Accepts a JSON array of contacts for bulk creation.
 * Body: { contacts: [{ first_name, last_name?, email?, phone?, company?, job_title?, ... }] }
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const rows = body.contacts;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "contacts array is required and cannot be empty" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 contacts per import" }, { status: 400 });
  }

  const companyId = guard.context.activeCompanyId;
  const userId = guard.context.user.id;

  const insertRows = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = (r.first_name ?? "").trim();
    if (!firstName) {
      errors.push({ row: i + 1, error: "first_name is required" });
      continue;
    }

    const fullName = [firstName, (r.last_name ?? "").trim()].filter(Boolean).join(" ");

    insertRows.push({
      company_id: companyId,
      name: fullName,
      email: r.email ?? null,
      phone: r.phone ?? null,
      company_name: r.company ?? r.crm_company_name ?? null,
      position: r.job_title ?? null,
      notes: r.notes ?? null,
      address_street: r.address_street ?? r.street ?? null,
      address_city: r.address_city ?? r.city ?? null,
      address_state: r.address_state ?? r.state ?? null,
      address_country: r.address_country ?? r.country ?? null,
      address_postal_code: r.address_postal_code ?? r.postal_code ?? null,
      created_by: userId,
    });
  }

  if (insertRows.length === 0) {
    return NextResponse.json({ error: "No valid contacts to import", validation_errors: errors }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert(insertRows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    imported: (data ?? []).length,
    skipped: errors.length,
    validation_errors: errors.length > 0 ? errors : undefined,
  }, { status: 201 });
}
