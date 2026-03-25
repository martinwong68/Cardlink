import type { Metadata } from "next";
import { fetchSiteData, fetchStoreData, fetchBookingServices } from "@/lib/cardlink-api";
import { CartProvider } from "@/lib/cart-context";
import SiteLayout from "@/components/SiteLayout";
import ShoppingCart from "@/components/ShoppingCart";
import StoreGrid from "./StoreGrid";

export async function generateMetadata(): Promise<Metadata> {
  const storeData = await fetchStoreData();
  return { title: storeData?.store.name ?? "Store" };
}

export default async function StorePage() {
  const [siteData, storeData, bookingData] = await Promise.all([
    fetchSiteData(),
    fetchStoreData(),
    fetchBookingServices(),
  ]);

  const { settings, navigation, pages } = siteData;
  const primaryColor = settings?.primary_color ?? storeData?.store.theme_color ?? "#4f46e5";

  if (!storeData) {
    return (
      <SiteLayout settings={settings} navigation={navigation} pages={pages} hasStore={false} hasBooking={bookingData.services.length > 0}>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <span className="text-4xl">🛍️</span>
          <p className="mt-4 text-gray-500">Store is not available.</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout settings={settings} navigation={navigation} pages={pages} hasStore={true} hasBooking={bookingData.services.length > 0}>
      <CartProvider>
      {/* Banner */}
      {storeData.store.banner_url && (
        <div className="relative h-48 sm:h-64 bg-gray-100">
          <img src={storeData.store.banner_url} alt={storeData.store.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl font-bold">{storeData.store.name}</h1>
              {storeData.store.description && <p className="mt-2 text-lg opacity-90">{storeData.store.description}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {!storeData.store.banner_url && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{storeData.store.name}</h1>
            {storeData.store.description && <p className="mt-2 text-gray-600">{storeData.store.description}</p>}
          </div>
        )}

        {/* Categories */}
        {storeData.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {storeData.categories.map((cat) => (
              <span key={cat.id} className="rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 text-gray-700 bg-gray-50">
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <StoreGrid products={storeData.products} primaryColor={primaryColor} />
      </div>

      <ShoppingCart primaryColor={primaryColor} />
      </CartProvider>
    </SiteLayout>
  );
}
