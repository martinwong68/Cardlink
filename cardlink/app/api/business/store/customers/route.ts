import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/* ── GET /api/business/store/customers — List customers ──── */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const format = url.searchParams.get("format");

  const supabase = await createClient();
  let query = supabase
    .from("store_customers")
    .select("id, name, email, phone, total_orders, total_spent, last_order_at, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // CSV export
  if (format === "csv") {
    const rows = (data ?? []).map((c) =>
      [c.name, c.email ?? "", c.phone ?? "", c.total_orders, c.total_spent, c.last_order_at ?? ""].join(",")
    );
    const csv = ["Name,Email,Phone,Orders,Spent,Last Order", ...rows].join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=store-customers.csv" },
    });
  }

  return NextResponse.json({ customers: data ?? [] });
}

/* ── POST /api/business/store/customers — Create customer ── */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_customers")
    .insert({
      company_id: guard.context.activeCompanyId,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      addresses: body.addresses ?? [],
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customer: data }, { status: 201 });
}
