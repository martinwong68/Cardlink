import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

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
  description: string | null;
  sort_order: number;
};

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const supabase = await createClient();

  // Resolve company
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

  // Load company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, logo_url")
    .eq("id", resolvedCompanyId)
    .eq("is_active", true)
    .single();

  if (!company) notFound();

  // Load store settings
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("store_name, description, banner_url, theme_color, is_published")
    .eq("company_id", resolvedCompanyId)
    .maybeSingle();

  if (!storeSettings?.is_published) notFound();

  // Load website settings for consistent branding
  const { data: siteSettings } = await supabase
    .from("website_settings")
    .select("site_title, logo_url, primary_color")
    .eq("company_id", resolvedCompanyId)
    .eq("is_published", true)
    .maybeSingle();

  // Load categories and products
  const [catRes, prodRes] = await Promise.all([
    supabase
      .from("store_categories")
      .select("id, name, slug, description, sort_order")
      .eq("company_id", resolvedCompanyId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("store_products")
      .select("id, name, slug, description, price, compare_at_price, product_type, images, category_id")
      .eq("company_id", resolvedCompanyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const categories = (catRes.data ?? []) as StoreCategory[];
  const products = (prodRes.data ?? []) as StoreProduct[];
  const siteSlug = company.slug ?? company.id;
  const siteName = siteSettings?.site_title ?? company.name;
  const primaryColor = (siteSettings?.primary_color ?? storeSettings.theme_color ?? "#4f46e5") as string;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href={`/site/${siteSlug}`} className="flex items-center gap-3">
            {(siteSettings?.logo_url ?? company.logo_url) && (
              <img
                src={(siteSettings?.logo_url ?? company.logo_url) as string}
                alt={siteName as string}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <span className="text-lg font-semibold text-gray-900">{siteName}</span>
          </Link>
          <Link
            href={`/site/${siteSlug}`}
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      {/* Banner */}
      {storeSettings.banner_url && (
        <div className="relative h-48 sm:h-64 bg-gray-100">
          <img
            src={storeSettings.banner_url as string}
            alt={storeSettings.store_name as string}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl font-bold">{storeSettings.store_name}</h1>
              {storeSettings.description && (
                <p className="mt-2 text-lg opacity-90">{storeSettings.description as string}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Store Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {!storeSettings.banner_url && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{storeSettings.store_name}</h1>
            {storeSettings.description && (
              <p className="mt-2 text-gray-600">{storeSettings.description as string}</p>
            )}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 text-gray-700 bg-gray-50"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition group"
              >
                {Array.isArray(product.images) && product.images.length > 0 ? (
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={product.images[0] as string}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    <span className="text-4xl text-gray-300">📦</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      ${Number(product.price).toFixed(2)}
                    </span>
                    {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        ${Number(product.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                    {product.product_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-4xl">🛍️</span>
            <p className="mt-4 text-gray-500">No products available yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {siteName}. Powered by Cardlink.</p>
        </div>
      </footer>
    </div>
  );
}
