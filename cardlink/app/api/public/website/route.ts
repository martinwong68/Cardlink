import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Public Website API — no auth required.
 * Serves published website content for the separate customer-facing website.
 *
 * GET /api/public/website?company_id=xxx          → full site data
 * GET /api/public/website?company_id=xxx&page=slug → single page
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");
  const pageSlug = url.searchParams.get("page");

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  }

  const supabase = await createClient();

  // If requesting a single page
  if (pageSlug) {
    const { data: page, error } = await supabase
      .from("website_pages")
      .select("id, slug, title, page_type, content, meta_title, meta_description, sort_order")
      .eq("company_id", companyId)
      .eq("slug", pageSlug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

    return NextResponse.json({ page });
  }

  // Full site data
  const [settingsRes, pagesRes, navRes] = await Promise.all([
    supabase
      .from("website_settings")
      .select("site_title, tagline, logo_url, favicon_url, primary_color, secondary_color, font_family, custom_css, custom_head_html, contact_email, contact_phone, contact_address, social_facebook, social_instagram, social_twitter, social_linkedin, social_youtube, footer_text, meta_title, meta_description, meta_og_image")
      .eq("company_id", companyId)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("website_pages")
      .select("id, slug, title, page_type, content, meta_title, meta_description, sort_order, show_in_nav")
      .eq("company_id", companyId)
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("website_nav_items")
      .select("id, label, url, page_id, parent_id, sort_order, open_in_new_tab")
      .eq("company_id", companyId)
      .eq("is_visible", true)
      .order("sort_order"),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });

  return NextResponse.json({
    settings: settingsRes.data,
    pages: pagesRes.data ?? [],
    navigation: navRes.data ?? [],
  });
}

/**
 * Public form submission (contact forms etc.)
 * POST /api/public/website
 * Body: { company_id, page_id?, form_type?, data: { name, email, message, ... } }
 */
export async function POST(request: Request) {
  let body: { company_id?: string; page_id?: string; form_type?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.company_id || !body.data) {
    return NextResponse.json({ error: "company_id and data are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_form_submissions")
    .insert({
      company_id: body.company_id,
      page_id: body.page_id ?? null,
      form_type: body.form_type ?? "contact",
      data: body.data,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "submitted" }, { status: 201 });
}
