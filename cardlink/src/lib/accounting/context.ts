import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export type AccountingRole = "admin" | "accountant" | "viewer";

const ADMIN_ROLES = new Set([
  "owner",
  "admin",
  "manager",
  "company_owner",
  "company_admin",
]);

const ACCOUNTANT_ROLES = new Set(["accountant", "bookkeeper", "finance"]);

export type AccountingContext = {
  organizationId: string;
  userId: string;
  role: AccountingRole;
  canWrite: boolean;
};

function toAccountingRole(rawRole: string | null | undefined, isMasterUser: boolean): AccountingRole {
  if (isMasterUser) {
    return "admin";
  }

  const role = (rawRole ?? "").toLowerCase();
  if (ADMIN_ROLES.has(role)) {
    return "admin";
  }
  if (ACCOUNTANT_ROLES.has(role)) {
    return "accountant";
  }
  return "viewer";
}

export async function requireAccountingContext(params: {
  request: Request;
  expectedOrganizationId?: string | null;
  write?: boolean;
}): Promise<
  | { ok: true; context: AccountingContext }
  | { ok: false; response: NextResponse }
> {
  const guard = await requireBusinessActiveCompanyContext({
    request: params.request,
    expectedCompanyId: params.expectedOrganizationId,
  });

  if (!guard.ok) {
    return guard;
  }

  const supabase = await createClient();

  const organizationId = guard.context.activeCompanyId;
  const { data: companyData } = await supabase
    .from("companies")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  const { error: upsertError } = await supabase.from("organizations").upsert(
    {
      id: organizationId,
      name: companyData?.name ?? "Organization",
      currency: "USD",
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    return {
      ok: false,
      response: NextResponse.json({ error: upsertError.message }, { status: 500 }),
    };
  }

  const { data: memberData } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", organizationId)
    .eq("user_id", guard.context.user.id)
    .eq("status", "active")
    .maybeSingle();

  const role = toAccountingRole((memberData?.role as string | null | undefined) ?? null, guard.context.isMasterUser);
  const canWrite = role !== "viewer";

  if (params.write && !canWrite) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accounting write access denied." }, { status: 403 }),
    };
  }

  return {
    ok: true,
    context: {
      organizationId,
      userId: guard.context.user.id,
      role,
      canWrite,
    },
  };
}
