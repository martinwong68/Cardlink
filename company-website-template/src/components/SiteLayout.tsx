"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteSettings, NavItem, SitePage, StoreData } from "@/lib/cardlink-api";

type Props = {
  settings: SiteSettings | null;
  navigation: NavItem[];
  pages: SitePage[];
  hasStore: boolean;
  hasBooking: boolean;
  children: React.ReactNode;
};

export default function SiteLayout({ settings, navigation, pages, hasStore, hasBooking, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const siteName = settings?.site_title ?? "Our Company";
  const primaryColor = settings?.primary_color ?? "#4f46e5";

  // Build nav links from navigation items or page list
  const navLinks: Array<{ label: string; href: string; external: boolean }> = [];
  if (navigation.length > 0) {
    for (const nav of navigation) {
      const href = nav.page_id
        ? `/page/${pages.find((p) => p.id === nav.page_id)?.slug ?? ""}`
        : nav.url ?? "#";
      navLinks.push({ label: nav.label, href, external: nav.open_in_new_tab });
    }
  } else {
    for (const p of pages.filter((pg) => pg.show_in_nav)) {
      navLinks.push({ label: p.title, href: `/page/${p.slug}`, external: false });
    }
  }
  if (hasStore) navLinks.push({ label: "Store", href: "/store", external: false });
  if (hasBooking) navLinks.push({ label: "Book Now", href: "/booking", external: false });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt={siteName} className="h-8 w-8 rounded-lg object-cover" />
            )}
            <span className="text-lg font-semibold text-gray-900">{siteName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-sm text-gray-600 hover:text-gray-900 transition"
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-gray-100 px-4 py-3 space-y-2">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-gray-600 hover:text-gray-900 py-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-gray-900">{siteName}</p>
              {settings?.footer_text && <p className="mt-2 text-sm text-gray-500">{settings.footer_text}</p>}
            </div>

            {(settings?.contact_email || settings?.contact_phone || settings?.contact_address) && (
              <div>
                <p className="font-semibold text-gray-900 text-sm">Contact</p>
                <div className="mt-1 space-y-0.5">
                  {settings.contact_email && <p className="text-sm text-gray-500">{settings.contact_email}</p>}
                  {settings.contact_phone && <p className="text-sm text-gray-500">{settings.contact_phone}</p>}
                  {settings.contact_address && <p className="text-sm text-gray-500">{settings.contact_address}</p>}
                </div>
              </div>
            )}

            {(settings?.social_facebook || settings?.social_instagram || settings?.social_twitter || settings?.social_linkedin || settings?.social_youtube) && (
              <div>
                <p className="font-semibold text-gray-900 text-sm">Follow Us</p>
                <div className="mt-1 flex flex-col gap-1">
                  {settings.social_facebook && <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Facebook</a>}
                  {settings.social_instagram && <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Instagram</a>}
                  {settings.social_twitter && <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Twitter</a>}
                  {settings.social_linkedin && <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">LinkedIn</a>}
                  {settings.social_youtube && <a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">YouTube</a>}
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
