import Link from "next/link";
import { fetchSiteData, fetchStoreData, fetchBookingServices } from "@/lib/cardlink-api";
import SiteLayout from "@/components/SiteLayout";

export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const [siteData, storeData, bookingData] = await Promise.all([
    fetchSiteData(),
    fetchStoreData(),
    fetchBookingServices(),
  ]);

  const { settings, navigation, pages } = siteData;
  const primaryColor = settings?.primary_color ?? "#4f46e5";
  const blogPages = pages.filter((p) => p.page_type === "blog");

  return (
    <SiteLayout settings={settings} navigation={navigation} pages={pages} hasStore={!!storeData} hasBooking={bookingData.services.length > 0}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blog</h1>

        {blogPages.length > 0 ? (
          <div className="space-y-6">
            {blogPages.map((post) => (
              <Link
                key={post.id}
                href={`/page/${post.slug}`}
                className="block rounded-xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm transition"
              >
                <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
                {post.meta_description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">{post.meta_description}</p>
                )}
                <span className="mt-3 inline-block text-sm font-medium hover:underline" style={{ color: primaryColor }}>
                  Read more →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-4xl">📝</span>
            <p className="mt-4 text-gray-500">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
