import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { encryptSensitiveValue } from "@/src/lib/accounting/encryption";

type PayrollDraft = {
  org_id?: string;
  employee_id?: string;
  period_start?: string;
  period_end?: string;
  gross_salary?: number;
  deductions?: number;
  status?: "draft" | "processed" | "paid";
  bank_details?: string;
  salary_note?: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_records")
    .select("id, org_id, employee_id, period_start, period_end, gross_salary, deductions, net_salary, status, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("period_start", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.payroll.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    payroll_records: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as PayrollDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const employeeId = body.employee_id?.trim();
  const periodStart = body.period_start;
  const periodEnd = body.period_end;
  const grossSalary = Number(body.gross_salary ?? -1);
  const deductions = Number(body.deductions ?? 0);

  if (!employeeId || !periodStart || !periodEnd || grossSalary < 0 || deductions < 0) {
    return NextResponse.json(
      { error: "employee_id, period_start, period_end, gross_salary, deductions are required." },
      { status: 400 }
    );
  }

  const netSalary = round2(grossSalary - deductions);
  if (netSalary < 0) {
    return NextResponse.json({ error: "deductions cannot exceed gross_salary." }, { status: 400 });
  }

  const encryptedBankDetails = body.bank_details?.trim()
    ? encryptSensitiveValue(body.bank_details.trim())
    : null;

  const encryptedSalaryNote = body.salary_note?.trim()
    ? encryptSensitiveValue(body.salary_note.trim())
    : null;

  const supabase = await createClient();

  const { data: employeeRow } = await supabase
    .from("contacts")
    .select("id")
    .eq("org_id", guard.context.organizationId)
    .eq("id", employeeId)
    .eq("type", "employee")
    .maybeSingle();

  if (!employeeRow) {
    return NextResponse.json({ error: "employee_id is not a valid employee contact in organization scope." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("payroll_records")
    .insert({
      org_id: guard.context.organizationId,
      employee_id: employeeId,
      period_start: periodStart,
      period_end: periodEnd,
      gross_salary: grossSalary,
      deductions,
      net_salary: netSalary,
      status: body.status ?? "draft",
      encrypted_bank_details: encryptedBankDetails,
      encrypted_salary_note: encryptedSalaryNote,
    })
    .select("id, employee_id, period_start, period_end, gross_salary, deductions, net_salary, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "accounting.payroll.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      payroll_record: data,
      encrypted_fields: ["bank_details", "salary_note"],
      emitted_events: ["accounting.payroll.recorded"],
    },
    { status: 201 }
  );
}
