import { NextResponse } from "next/server";

import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type CompanyProfileUpdate = {
  company_id?: string;
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
};

export async function PATCH(request: Request) {
  const body = (await request.json()) as CompanyProfileUpdate;
  const expectedCompanyId = body.company_id?.trim();

  const guard = await requireBusinessActiveCompanyContext({
    request,
    expectedCompanyId,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({
      name,
      description: body.description?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      cover_url: body.cover_url?.trim() || null,
    })
    .eq("id", guard.context.activeCompanyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Active company was not found for update." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      contract: "company.management.profile.v1",
      status: "updated",
      company_id: guard.context.activeCompanyId,
    },
    { status: 200 }
  );
}