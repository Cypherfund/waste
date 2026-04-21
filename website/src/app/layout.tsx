import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { i18n, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DictionaryProvider } from "@/i18n/DictionaryProvider";

export const metadata: Metadata = {
  title: "KmerTrash — Smart Waste Collection for Douala",
  description:
    "KmerTrash connects households with waste collectors in Douala, Cameroon. Schedule pickups, track collectors in real-time, and keep your community clean.",
  keywords: [
    "waste collection",
    "Douala",
    "Cameroon",
    "smart city",
    "waste management",
    "recycling",
  ],
  openGraph: {
    title: "KmerTrash — Smart Waste Collection for Douala",
    description:
      "Connect with waste collectors in Douala. Schedule pickups, track in real-time.",
    type: "website",
    locale: "en_US",
    siteName: "KmerTrash",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = (i18n.locales as readonly string[]).includes(localeCookie ?? "")
    ? (localeCookie as Locale)
    : i18n.defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <DictionaryProvider initialDict={dict} initialLocale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </DictionaryProvider>
        <JsonLd />
      </body>
    </html>
  );
}
