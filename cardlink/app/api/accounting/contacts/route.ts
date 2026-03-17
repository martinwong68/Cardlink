import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type ContactDraft = {
  org_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  type?: "customer" | "vendor" | "employee";
  address?: string;
  tax_id?: string;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, org_id, name, email, phone, type, address, tax_id, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.contacts.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    contacts: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ContactDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const name = body.name?.trim();
  const type = body.type?.trim().toLowerCase();
  if (!name || !type || !["customer", "vendor", "employee"].includes(type)) {
    return NextResponse.json({ error: "name and type(customer/vendor/employee) are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      org_id: guard.context.organizationId,
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      type,
      address: body.address?.trim() || null,
      tax_id: body.tax_id?.trim() || null,
    })
    .select("id, name, type")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "accounting.contacts.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      contact: data,
      emitted_events: ["accounting.contact.created"],
    },
    { status: 201 }
  );
}
