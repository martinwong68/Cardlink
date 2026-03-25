import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * POST /api/public/website/heartbeat
 *
 * Called by the company-website-template on every page load.
 * Registers the website URL and updates last_heartbeat_at so the
 * Cardlink dashboard can show which website is connected to which company.
 *
 * Body: { company_id: string, website_url: string }
 */
export async function POST(request: Request) {
  let body: { company_id?: string; website_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const companyId = body.company_id;
  const websiteUrl = body.website_url;

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  }
  if (!websiteUrl) {
    return NextResponse.json({ error: "website_url is required." }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(websiteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid website_url format." }, { status: 400 });
  }

  const supabase = await createClient();

  // Update the website_settings row for this company
  const { error } = await supabase
    .from("website_settings")
    .update({
      linked_website_url: websiteUrl,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  if (error) {
    // If no row exists yet, try to upsert one
    const { error: upsertError } = await supabase
      .from("website_settings")
      .upsert(
        {
          company_id: companyId,
          linked_website_url: websiteUrl,
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ status: "ok" });
}
