import type { Metadata } from "next";
import { fetchSiteData } from "@/lib/cardlink-api";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await fetchSiteData();
  return {
    title: settings?.meta_title ?? settings?.site_title ?? "Company Website",
    description: settings?.meta_description ?? settings?.tagline ?? "",
    openGraph: settings?.meta_og_image ? { images: [settings.meta_og_image] } : undefined,
    icons: settings?.favicon_url ? [{ url: settings.favicon_url }] : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
