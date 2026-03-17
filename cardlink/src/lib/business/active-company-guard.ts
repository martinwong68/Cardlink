import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";
import { isBusinessScopedRequest } from "@/src/lib/business/scope-guard";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";

export type BusinessActiveCompanyContext = {
  user: User;
  activeCompanyId: string;
  isMasterUser: boolean;
  adminCompanyIds: string[];
};

export async function requireBusinessActiveCompanyContext(params: {
  request: Request;
  expectedCompanyId?: string | null;
}): Promise<
  | { ok: true; context: BusinessActiveCompanyContext }
  | { ok: false; response: NextResponse }
> {
  if (!isBusinessScopedRequest(params.request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Business write APIs are restricted to Business App routes." },
        { status: 403 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const eligibility = await resolveBusinessEligibility(supabase, user);
  if (!eligibility.eligible) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Business access denied." },
        { status: 403 }
      ),
    };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("business_active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeCompanyId =
    (profileData?.business_active_company_id ?? null) as string | null;

  if (!activeCompanyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No active business company selected." },
        { status: 400 }
      ),
    };
  }

  if (!eligibility.isMasterUser && !eligibility.adminCompanyIds.includes(activeCompanyId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Active company is outside your management scope." },
        { status: 403 }
      ),
    };
  }

  const expected = params.expectedCompanyId?.trim();
  if (expected && expected !== activeCompanyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request company_id must match your active company context." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    context: {
      user,
      activeCompanyId,
      isMasterUser: eligibility.isMasterUser,
      adminCompanyIds: eligibility.adminCompanyIds,
    },
  };
}
