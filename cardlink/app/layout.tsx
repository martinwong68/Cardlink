import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body
        className={`${inter.className} ${inter.variable} min-h-screen bg-gray-50 text-gray-900 antialiased`}
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
