import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { resolveBusinessEligibility } from "@/src/lib/business/eligibility";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        eligible: false,
        isMasterUser: false,
        adminCompanyIds: [],
        reasonCode: "not_authenticated",
      },
      { status: 401 }
    );
  }

  const decision = await resolveBusinessEligibility(supabase, user);

  return NextResponse.json(
    {
      eligible: decision.eligible,
      isMasterUser: decision.isMasterUser,
      adminCompanyIds: decision.adminCompanyIds,
      reasonCode: decision.reasonCode,
    },
    { status: 200 }
  );
}