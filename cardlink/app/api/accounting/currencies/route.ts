import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

type CurrencyDraft = {
  org_id?: string;
  code?: string;
  name?: string;
  symbol?: string;
  exchange_rate?: number;
};

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("currencies")
    .select("id, org_id, code, name, symbol, exchange_rate, last_updated")
    .eq("org_id", guard.context.organizationId)
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.currencies.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    currencies: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CurrencyDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) {
    return guard.response;
  }

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim();
  const symbol = body.symbol?.trim();
  const exchangeRate = Number(body.exchange_rate ?? 0);

  if (!code || !name || !symbol || exchangeRate <= 0) {
    return NextResponse.json(
      { error: "code, name, symbol, exchange_rate (>0) are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("currencies")
    .upsert(
      {
        org_id: guard.context.organizationId,
        code,
        name,
        symbol,
        exchange_rate: exchangeRate,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "org_id,code" }
    )
    .select("id, code, name, symbol, exchange_rate, last_updated")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    contract: "accounting.currencies.v1",
    status: "upserted",
    organization_id: guard.context.organizationId,
    currency: data,
    emitted_events: ["accounting.currency.updated"],
  });
}
