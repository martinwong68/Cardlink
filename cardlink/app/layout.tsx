import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope, Syne } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getMessages, setRequestLocale } from "next-intl/server";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LoggedInTopHeader from "@/components/LoggedInTopHeader";
import { defaultLocale, locales } from "@/next-intl.config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-syne",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "CardLink",
  description: "CardLink",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const resolvedLocale = locales.includes(cookieLocale as (typeof locales)[number])
    ? (cookieLocale as (typeof locales)[number])
    : defaultLocale;
  setRequestLocale(resolvedLocale);
  const messages = await getMessages();
  return (
    <html lang={resolvedLocale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body
        className={`${inter.className} ${inter.variable} ${syne.variable} ${manrope.variable} ${plexMono.variable} min-h-screen bg-neutral-50 text-neutral-900 antialiased`}
      >
        <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
          <LoggedInTopHeader />
          {children}
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
