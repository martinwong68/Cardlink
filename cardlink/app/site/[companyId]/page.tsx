import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

type SiteSettings = {
  site_title: string | null;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  footer_text: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

type SitePage = {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  content: unknown;
  show_in_nav: boolean;
  sort_order: number;
};

type NavItem = {
  id: string;
  label: string;
  url: string | null;
  page_id: string | null;
  parent_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
};

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  product_type: string;
  images: string[];
  category_id: string | null;
};

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
};

type StoreData = {
  store: { name: string; description: string | null; banner_url: string | null; theme_color: string | null };
  categories: StoreCategory[];
  products: StoreProduct[];
} | null;

function renderContentBlock(content: unknown): React.ReactNode {
  if (!content) return null;
  if (typeof content === "string") {
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    // Handle JSON content blocks
    if (obj.body && typeof obj.body === "string") {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: obj.body }} />;
    }
    if (obj.text && typeof obj.text === "string") {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: obj.text }} />;
    }
    // Render as formatted text
    return <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  }
  return null;
}

export default async function CompanySitePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
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
    .select("id, name, slug, description, logo_url, cover_url")
    .eq("id", resolvedCompanyId)
    .eq("is_active", true)
    .single();

  if (!company) notFound();

  // Load website data
  const [settingsRes, pagesRes, navRes] = await Promise.all([
    supabase
      .from("website_settings")
      .select("site_title, tagline, logo_url, primary_color, secondary_color, contact_email, contact_phone, contact_address, social_facebook, social_instagram, social_twitter, social_linkedin, footer_text, meta_title, meta_description")
      .eq("company_id", resolvedCompanyId)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("website_pages")
      .select("id, slug, title, page_type, content, show_in_nav, sort_order")
      .eq("company_id", resolvedCompanyId)
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("website_nav_items")
      .select("id, label, url, page_id, parent_id, sort_order, open_in_new_tab")
      .eq("company_id", resolvedCompanyId)
      .eq("is_visible", true)
      .order("sort_order"),
  ]);

  const settings = settingsRes.data as SiteSettings | null;
  const pages = (pagesRes.data ?? []) as SitePage[];
  const navigation = (navRes.data ?? []) as NavItem[];

  // Load store data
  let storeData: StoreData = null;
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("store_name, description, banner_url, theme_color, is_published")
    .eq("company_id", resolvedCompanyId)
    .maybeSingle();

  if (storeSettings?.is_published) {
    const [catRes, prodRes] = await Promise.all([
      supabase
        .from("store_categories")
        .select("id, name, slug")
        .eq("company_id", resolvedCompanyId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("store_products")
        .select("id, name, slug, description, price, compare_at_price, product_type, images, category_id")
        .eq("company_id", resolvedCompanyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    storeData = {
      store: {
        name: storeSettings.store_name as string,
        description: storeSettings.description as string | null,
        banner_url: storeSettings.banner_url as string | null,
        theme_color: storeSettings.theme_color as string | null,
      },
      categories: (catRes.data ?? []) as StoreCategory[],
      products: (prodRes.data ?? []) as StoreProduct[],
    };
  }

  const primaryColor = settings?.primary_color ?? "#4f46e5";
  const siteName = settings?.site_title ?? company.name;
  const siteSlug = company.slug ?? company.id;

  // Find the home page
  const homePage = pages.find((p) => p.page_type === "home") ?? pages[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navigation */}
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
                  return (
                    <Link
                      key={nav.id}
                      href={href}
                      className="text-sm text-gray-600 hover:text-gray-900 transition"
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
                      className="text-sm text-gray-600 hover:text-gray-900 transition"
                    >
                      {p.title}
                    </Link>
                  ))}
            {storeData && (
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

      {/* Hero / Tagline */}
      {settings?.tagline && (
        <div
          className="py-12 sm:py-16 text-center"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{siteName}</h1>
            <p className="mt-3 text-lg text-gray-600">{settings.tagline}</p>
          </div>
        </div>
      )}

      {/* Main Content — render home page */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        {homePage ? (
          <article>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{homePage.title}</h2>
            {renderContentBlock(homePage.content)}
          </article>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
            {company.description && (
              <p className="mt-3 text-gray-600">{company.description as string}</p>
            )}
          </div>
        )}

        {/* Pages listing (non-home) */}
        {pages.filter((p) => p.id !== homePage?.id).length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {pages
              .filter((p) => p.id !== homePage?.id)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/site/${siteSlug}/${p.slug}`}
                  className="block rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition"
                >
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 capitalize">{p.page_type}</p>
                </Link>
              ))}
          </div>
        )}

        {/* Store preview */}
        {storeData && storeData.products.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{storeData.store.name ?? "Our Store"}</h2>
              <Link
                href={`/site/${siteSlug}/store`}
                className="text-sm font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                View all →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storeData.products.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition"
                >
                  {Array.isArray(product.images) && product.images.length > 0 && (
                    <img
                      src={product.images[0] as string}
                      alt={product.name}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                    {product.description && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                        <span className="text-xs text-gray-400 line-through">
                          ${Number(product.compare_at_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-gray-900">{siteName}</p>
              {settings?.footer_text && (
                <p className="mt-2 text-sm text-gray-500">{settings.footer_text}</p>
              )}
            </div>
            {(settings?.contact_email || settings?.contact_phone || settings?.contact_address) && (
              <div>
                <p className="font-semibold text-gray-900 text-sm">Contact</p>
                {settings.contact_email && (
                  <p className="mt-1 text-sm text-gray-500">{settings.contact_email}</p>
                )}
                {settings.contact_phone && (
                  <p className="text-sm text-gray-500">{settings.contact_phone}</p>
                )}
                {settings.contact_address && (
                  <p className="text-sm text-gray-500">{settings.contact_address}</p>
                )}
              </div>
            )}
            {(settings?.social_facebook || settings?.social_instagram || settings?.social_twitter || settings?.social_linkedin) && (
              <div>
                <p className="font-semibold text-gray-900 text-sm">Follow Us</p>
                <div className="mt-1 flex flex-col gap-1">
                  {settings.social_facebook && (
                    <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Facebook</a>
                  )}
                  {settings.social_instagram && (
                    <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Instagram</a>
                  )}
                  {settings.social_twitter && (
                    <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Twitter</a>
                  )}
                  {settings.social_linkedin && (
                    <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">LinkedIn</a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 border-t border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} {siteName}. Powered by Cardlink.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
