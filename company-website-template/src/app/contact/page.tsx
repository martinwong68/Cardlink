import type { Metadata } from "next";
import { fetchSiteData, fetchStoreData, fetchBookingServices } from "@/lib/cardlink-api";
import SiteLayout from "@/components/SiteLayout";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const [siteData, storeData, bookingData] = await Promise.all([
    fetchSiteData(),
    fetchStoreData(),
    fetchBookingServices(),
  ]);

  const { settings, navigation, pages } = siteData;
  const primaryColor = settings?.primary_color ?? "#4f46e5";

  return (
    <SiteLayout settings={settings} navigation={navigation} pages={pages} hasStore={!!storeData} hasBooking={bookingData.services.length > 0}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-8">
          Have a question or want to get in touch? Fill out the form below.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          <ContactForm primaryColor={primaryColor} />

          {(settings?.contact_email || settings?.contact_phone || settings?.contact_address) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Our Information</h2>
              {settings.contact_email && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-500">{settings.contact_email}</p>
                </div>
              )}
              {settings.contact_phone && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-500">{settings.contact_phone}</p>
                </div>
              )}
              {settings.contact_address && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-sm text-gray-500">{settings.contact_address}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
