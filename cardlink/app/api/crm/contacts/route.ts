import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .select("id, name, email, phone, company_name, position, tags, notes, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts = (data ?? []).map((row: any) => {
    const parts = (row.name ?? "").split(" ");
    return {
      id: row.id,
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" ") || null,
      email: row.email,
      phone: row.phone,
      crm_company_name: row.company_name,
      job_title: row.position,
      address: null,
      tags: row.tags ?? [],
      notes: row.notes,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const firstName = (body.first_name ?? "").trim();
  if (!firstName) return NextResponse.json({ error: "first_name is required" }, { status: 400 });

  const fullName = [firstName, (body.last_name ?? "").trim()].filter(Boolean).join(" ");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      company_id: guard.context.activeCompanyId,
      name: fullName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      company_name: body.crm_company_name ?? null,
      position: body.job_title ?? null,
      notes: body.notes ?? null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
