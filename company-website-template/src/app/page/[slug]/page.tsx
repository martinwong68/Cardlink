import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchSiteData, fetchPage, fetchStoreData, fetchBookingServices } from "@/lib/cardlink-api";
import SiteLayout from "@/components/SiteLayout";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return {};
  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? undefined,
  };
}

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

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const [page, siteData, storeData, bookingData] = await Promise.all([
    fetchPage(slug),
    fetchSiteData(),
    fetchStoreData(),
    fetchBookingServices(),
  ]);

  if (!page) notFound();

  const { settings, navigation, pages } = siteData;

  return (
    <SiteLayout
      settings={settings}
      navigation={navigation}
      pages={pages}
      hasStore={!!storeData}
      hasBooking={bookingData.services.length > 0}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
          {renderContent(page.content)}
        </article>
      </div>
    </SiteLayout>
  );
}
