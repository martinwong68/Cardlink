import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, slug, price_monthly, price_yearly, features, ai_actions_monthly, max_companies, max_users, storage_mb, pdf_export, document_ocr_monthly")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}
