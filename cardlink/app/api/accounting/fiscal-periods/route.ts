import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type FiscalYearDraft = {
  org_id?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
};

type PeriodStatusPayload = {
  org_id?: string;
  period_id?: string;
  status?: "open" | "closed" | "locked";
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();

  const { data: years, error: yearErr } = await supabase
    .from("fiscal_years")
    .select("id, org_id, name, start_date, end_date, status, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("start_date", { ascending: false });

  if (yearErr) return NextResponse.json({ error: yearErr.message }, { status: 500 });

  const yearIds = (years ?? []).map((y) => y.id);
  const { data: periods, error: periodErr } = yearIds.length
    ? await supabase
        .from("fiscal_periods")
        .select("id, fiscal_year_id, org_id, name, start_date, end_date, status, closed_by, closed_at, created_at")
        .in("fiscal_year_id", yearIds)
        .order("start_date", { ascending: true })
    : { data: [], error: null };

  if (periodErr) return NextResponse.json({ error: periodErr.message }, { status: 500 });

  const periodMap = new Map<string, unknown[]>();
  (periods ?? []).forEach((p) => {
    const list = periodMap.get(p.fiscal_year_id) ?? [];
    list.push(p);
    periodMap.set(p.fiscal_year_id, list);
  });

  return NextResponse.json({
    contract: "accounting.fiscal_periods.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    fiscal_years: (years ?? []).map((y) => ({
      ...y,
      periods: periodMap.get(y.id) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as FiscalYearDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const name = body.name?.trim();
  const startDate = body.start_date;
  const endDate = body.end_date;

  if (!name || !startDate || !endDate) {
    return NextResponse.json(
      { error: "name, start_date, and end_date are required." },
      { status: 400 }
    );
  }

  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "end_date must be after start_date." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: year, error: yearErr } = await supabase
    .from("fiscal_years")
    .insert({
      org_id: guard.context.organizationId,
      name,
      start_date: startDate,
      end_date: endDate,
      status: "open",
    })
    .select("id, name, start_date, end_date, status")
    .single();

  if (yearErr || !year) {
    const conflict = yearErr?.code === "23505";
    return NextResponse.json(
      { error: yearErr?.message ?? "Fiscal year create failed." },
      { status: conflict ? 409 : 400 }
    );
  }

  /* Auto-generate monthly periods */
  const { data: periodCount } = await supabase.rpc("generate_fiscal_periods", {
    p_fiscal_year_id: year.id,
    p_org_id: guard.context.organizationId,
  });

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "fiscal_year.created",
    tableName: "fiscal_years",
    recordId: year.id,
    newValues: { ...year, periods_generated: periodCount },
  });

  return NextResponse.json(
    {
      contract: "accounting.fiscal_periods.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      fiscal_year_id: year.id,
      periods_generated: periodCount ?? 0,
      emitted_events: ["accounting.fiscal_year.created"],
    },
    { status: 201 }
  );
}

/* PATCH: Change period status (open/closed/locked) */
export async function PATCH(request: Request) {
  const body = (await request.json()) as PeriodStatusPayload;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const periodId = body.period_id?.trim();
  const newStatus = body.status;

  if (!periodId || !newStatus) {
    return NextResponse.json({ error: "period_id and status are required." }, { status: 400 });
  }

  if (!["open", "closed", "locked"].includes(newStatus)) {
    return NextResponse.json({ error: "status must be open, closed, or locked." }, { status: 400 });
  }

  /* Only admins can reopen locked periods */
  if (newStatus === "open" && guard.context.role !== "admin") {
    return NextResponse.json({ error: "Only admins can reopen periods." }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("fiscal_periods")
    .select("id, status, name")
    .eq("id", periodId)
    .eq("org_id", guard.context.organizationId)
    .maybeSingle();

  if (!before) return NextResponse.json({ error: "Period not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("fiscal_periods")
    .update({
      status: newStatus,
      closed_by: newStatus !== "open" ? guard.context.userId : null,
      closed_at: newStatus !== "open" ? new Date().toISOString() : null,
    })
    .eq("id", periodId)
    .eq("org_id", guard.context.organizationId)
    .select("id, status, name")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Period status update failed." }, { status: 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "fiscal_period.status.updated",
    tableName: "fiscal_periods",
    recordId: periodId,
    oldValues: before,
    newValues: data,
  });

  return NextResponse.json({
    contract: "accounting.fiscal_periods.v1",
    status: "updated",
    organization_id: guard.context.organizationId,
    period_id: periodId,
    period_status: data.status,
    emitted_events: ["accounting.fiscal_period.status.changed"],
  });
}
