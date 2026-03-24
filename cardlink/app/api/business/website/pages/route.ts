import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/** GET/POST website pages for the authenticated company */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_pages")
    .select("*")
    .eq("company_id", guard.context.activeCompanyId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: {
    slug?: string; title?: string; page_type?: string; content?: unknown;
    is_published?: boolean; sort_order?: number; show_in_nav?: boolean;
    meta_title?: string; meta_description?: string;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "slug and title are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_pages")
    .insert({
      company_id: guard.context.activeCompanyId,
      slug: body.slug,
      title: body.title,
      page_type: body.page_type ?? "custom",
      content: body.content ?? {},
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
      show_in_nav: body.show_in_nav ?? true,
      meta_title: body.meta_title,
      meta_description: body.meta_description,
    })
    .select("id, slug, title")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 400 });
  }

  return NextResponse.json({ status: "created", page: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { id, ...updates } = body;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_pages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId)
    .select("id, slug, title")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found." }, { status: 400 });
  return NextResponse.json({ status: "updated", page: data });
}

export async function DELETE(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_pages")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.context.activeCompanyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "deleted" });
}
