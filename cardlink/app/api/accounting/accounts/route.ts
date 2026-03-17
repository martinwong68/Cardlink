import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";

type AccountDraft = {
  org_id?: string;
  code?: string;
  name?: string;
  type?: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent_id?: string | null;
  is_active?: boolean;
};

const ACCOUNT_TYPES = new Set(["asset", "liability", "equity", "revenue", "expense"]);

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, org_id, code, name, type, parent_id, is_active, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.accounts.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    role: guard.context.role,
    accounts: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as AccountDraft;

  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const code = body.code?.trim();
  const name = body.name?.trim();
  const type = body.type?.trim().toLowerCase();

  if (!code || !name || !type || !ACCOUNT_TYPES.has(type)) {
    return NextResponse.json(
      { error: "code, name, and type are required. type must be asset/liability/equity/revenue/expense." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      org_id: guard.context.organizationId,
      code,
      name,
      type,
      parent_id: body.parent_id ?? null,
      is_active: body.is_active ?? true,
    })
    .select("id, code, name, type")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "account.created",
    tableName: "accounts",
    recordId: data.id,
    newValues: data,
  });

  return NextResponse.json(
    {
      contract: "accounting.accounts.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      account: data,
      emitted_events: ["accounting.account.created"],
    },
    { status: 201 }
  );
}
