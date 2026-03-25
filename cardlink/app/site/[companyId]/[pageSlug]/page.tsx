import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

type SitePage = {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  content: unknown;
  meta_title: string | null;
  meta_description: string | null;
};

type NavItem = {
  id: string;
  label: string;
  url: string | null;
  page_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
};

function renderContentBlock(content: unknown): React.ReactNode {
  if (!content) return null;
  if (typeof content === "string") {
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    if (obj.body && typeof obj.body === "string") {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: obj.body }} />;
    }
    if (obj.text && typeof obj.text === "string") {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: obj.text }} />;
    }
    return <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  }
  return null;
}

export default async function SitePageRoute({
  params,
}: {
  params: Promise<{ companyId: string; pageSlug: string }>;
}) {
  const { companyId, pageSlug } = await params;
  const supabase = await createClient();

  // Resolve company — try as slug first, then as UUID
  let resolvedCompanyId = companyId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

  if (!isUuid) {
    const { data: companyBySlug } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", companyId)
      .eq("is_active", true)
      .maybeSingle();
    if (!companyBySlug) notFound();
    resolvedCompanyId = companyBySlug.id as string;
  }

  // Load company info
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, logo_url")
    .eq("id", resolvedCompanyId)
    .eq("is_active", true)
    .single();

  if (!company) notFound();

  // Load website settings
  const { data: settings } = await supabase
    .from("website_settings")
    .select("site_title, logo_url, primary_color, footer_text")
    .eq("company_id", resolvedCompanyId)
    .eq("is_published", true)
    .maybeSingle();

  // Load the requested page
  const { data: page } = await supabase
    .from("website_pages")
    .select("id, slug, title, page_type, content, meta_title, meta_description")
    .eq("company_id", resolvedCompanyId)
    .eq("slug", pageSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!page) notFound();
  const typedPage = page as SitePage;

  // Load all published pages for nav
  const { data: allPages } = await supabase
    .from("website_pages")
    .select("id, slug, title, show_in_nav, sort_order")
    .eq("company_id", resolvedCompanyId)
    .eq("is_published", true)
    .order("sort_order");

  // Load navigation
  const { data: navItems } = await supabase
    .from("website_nav_items")
    .select("id, label, url, page_id, sort_order, open_in_new_tab")
    .eq("company_id", resolvedCompanyId)
    .eq("is_visible", true)
    .order("sort_order");

  const navigation = (navItems ?? []) as NavItem[];
  const pages = (allPages ?? []) as Array<{ id: string; slug: string; title: string; show_in_nav: boolean; sort_order: number }>;
  const siteSlug = company.slug ?? company.id;
  const siteName = settings?.site_title ?? company.name;
  const primaryColor = (settings?.primary_color ?? "#4f46e5") as string;

  // Check if store exists for nav
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("is_published")
    .eq("company_id", resolvedCompanyId)
    .maybeSingle();
  const hasStore = storeSettings?.is_published === true;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href={`/site/${siteSlug}`} className="flex items-center gap-3">
            {(settings?.logo_url ?? company.logo_url) && (
              <img
                src={(settings?.logo_url ?? company.logo_url) as string}
                alt={siteName as string}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <span className="text-lg font-semibold text-gray-900">{siteName}</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {navigation.length > 0
              ? navigation.map((nav) => {
                  const href = nav.page_id
                    ? `/site/${siteSlug}/${pages.find((p) => p.id === nav.page_id)?.slug ?? ""}`
                    : nav.url ?? "#";
                  const isActive = nav.page_id === typedPage.id;
                  return (
                    <Link
                      key={nav.id}
                      href={href}
                      className={`text-sm transition ${isActive ? "font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
                      {...(nav.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {nav.label}
                    </Link>
                  );
                })
              : pages
                  .filter((p) => p.show_in_nav)
                  .map((p) => (
                    <Link
                      key={p.id}
                      href={`/site/${siteSlug}/${p.slug}`}
                      className={`text-sm transition ${p.slug === pageSlug ? "font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
                    >
                      {p.title}
                    </Link>
                  ))}
            {hasStore && (
              <Link
                href={`/site/${siteSlug}/store`}
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Store
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{typedPage.title}</h1>
          {renderContentBlock(typedPage.content)}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">{siteName}</p>
            {settings?.footer_text && (
              <p className="text-sm text-gray-500">{settings.footer_text as string}</p>
            )}
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} {siteName}. Powered by Cardlink.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
