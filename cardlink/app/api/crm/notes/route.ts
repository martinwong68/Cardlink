import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const contactId = url.searchParams.get("contact_id");

  const supabase = await createClient();
  let query = supabase
    .from("crm_notes")
    .select("id, contact_id, note_text, tags, reminder_date, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const noteText = (body.note_text ?? "").trim();
  if (!noteText) return NextResponse.json({ error: "note_text is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notes")
    .insert({
      company_id: guard.context.activeCompanyId,
      owner_id: guard.context.user.id,
      contact_id: body.contact_id ?? null,
      note_text: noteText,
      tags: body.tags ?? null,
      reminder_date: body.reminder_date ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
