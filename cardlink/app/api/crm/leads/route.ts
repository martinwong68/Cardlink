import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("id, name, email, phone, source, status, value, notes, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status === "proposal" || row.status === "negotiation" ? "qualified" : row.status === "won" ? "converted" : row.status,
    temperature: Number(row.value) > 5000 ? "hot" : Number(row.value) > 1000 ? "warm" : "cold",
    score: Math.min(100, Math.round(Number(row.value) / 100)),
    value: Number(row.value),
    notes: row.notes,
    created_at: row.created_at,
  }));

  /* ── CSV export ── */
  if (format === "csv") {
    const header = "id,name,email,phone,source,status,value,temperature,score,notes";
    const rows = leads.map((l: any) =>
      [l.id, l.title, l.email ?? "", l.phone ?? "", l.source ?? "", l.status, l.value, l.temperature, l.score, (l.notes ?? "").replace(/"/g, '""')]
        .map((v: unknown) => `"${v}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="crm_leads.csv"',
      },
    });
  }

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const name = (body.title ?? "").trim();
  if (!name) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      company_id: guard.context.activeCompanyId,
      name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      source: body.source ?? "manual",
      status: body.status ?? "new",
      value: body.value ?? 0,
      notes: body.notes ?? null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
