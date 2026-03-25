import type { Metadata } from "next";
import { fetchSiteData, fetchBookingServices, fetchStoreData } from "@/lib/cardlink-api";
import SiteLayout from "@/components/SiteLayout";
import BookingWidget from "@/components/BookingWidget";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await fetchBookingServices();
  return { title: settings.booking_page_title ?? "Book an Appointment" };
}

export default async function BookingPage() {
  const [siteData, bookingData, storeData] = await Promise.all([
    fetchSiteData(),
    fetchBookingServices(),
    fetchStoreData(),
  ]);

  const { settings, navigation, pages } = siteData;
  const primaryColor = settings?.primary_color ?? "#4f46e5";

  return (
    <SiteLayout settings={settings} navigation={navigation} pages={pages} hasStore={!!storeData} hasBooking={bookingData.services.length > 0}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {bookingData.settings.booking_page_title ?? "Book an Appointment"}
        </h1>
        {bookingData.settings.booking_page_description && (
          <p className="text-gray-600 mb-8">{bookingData.settings.booking_page_description}</p>
        )}

        {bookingData.services.length > 0 ? (
          <BookingWidget services={bookingData.services} settings={bookingData.settings} primaryColor={primaryColor} />
        ) : (
          <div className="text-center py-16">
            <span className="text-4xl">📅</span>
            <p className="mt-4 text-gray-500">Online booking is not available yet.</p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
