import Link from "next/link";
import { fetchSiteData, fetchStoreData, fetchBookingServices } from "@/lib/cardlink-api";
import SiteLayout from "@/components/SiteLayout";

function renderContent(content: unknown): React.ReactNode {
  if (!content) return null;
  if (typeof content === "string") {
    return <div className="prose max-w-none whitespace-pre-wrap">{content}</div>;
  }
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    if (obj.body && typeof obj.body === "string") {
      return <div className="prose max-w-none whitespace-pre-wrap">{obj.body}</div>;
    }
    if (obj.text && typeof obj.text === "string") {
      return <div className="prose max-w-none whitespace-pre-wrap">{obj.text}</div>;
    }
    return <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  }
  return null;
}

export default async function HomePage() {
  const [siteData, storeData, bookingData] = await Promise.all([
    fetchSiteData(),
    fetchStoreData(),
    fetchBookingServices(),
  ]);

  const { settings, pages, navigation } = siteData;
  const primaryColor = settings?.primary_color ?? "#4f46e5";
  const siteName = settings?.site_title ?? "Our Company";
  const homePage = pages.find((p) => p.page_type === "home") ?? pages[0];

  return (
    <SiteLayout
      settings={settings}
      navigation={navigation}
      pages={pages}
      hasStore={!!storeData}
      hasBooking={bookingData.services.length > 0}
    >
      {/* Hero */}
      {settings?.tagline && (
        <div className="py-12 sm:py-16 text-center" style={{ backgroundColor: `${primaryColor}10` }}>
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{siteName}</h1>
            <p className="mt-3 text-lg text-gray-600">{settings.tagline}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        {/* Home page content */}
        {homePage ? (
          <article>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{homePage.title}</h2>
            {renderContent(homePage.content)}
          </article>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900">{siteName}</h2>
            <p className="mt-3 text-gray-500">Welcome to our website.</p>
          </div>
        )}

        {/* Other pages */}
        {pages.filter((p) => p.id !== homePage?.id).length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {pages
              .filter((p) => p.id !== homePage?.id)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/page/${p.slug}`}
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
              <Link href="/store" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>
                View all →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storeData.products.slice(0, 6).map((product) => (
                <div key={product.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition">
                  {Array.isArray(product.images) && product.images.length > 0 && (
                    <img src={product.images[0]} alt={product.name} className="h-40 w-full object-cover" />
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                    {product.description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: primaryColor }}>${Number(product.price).toFixed(2)}</span>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                        <span className="text-xs text-gray-400 line-through">${Number(product.compare_at_price).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Booking preview */}
        {bookingData.services.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {bookingData.settings.booking_page_title ?? "Book an Appointment"}
              </h2>
              <Link href="/booking" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>
                View all →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {bookingData.services.slice(0, 4).map((svc) => (
                <Link
                  key={svc.id}
                  href="/booking"
                  className="block rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition"
                >
                  <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{svc.duration_minutes} min</p>
                  {svc.price > 0 && <p className="mt-1 text-sm font-semibold" style={{ color: primaryColor }}>${Number(svc.price).toFixed(2)}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
