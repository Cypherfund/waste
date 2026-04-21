import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getLocale } from "@/i18n/getLocale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = getLocale();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <Header lang={lang} dict={dict.common} />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} dict={dict.common} />
        <JsonLd />
      </body>
    </html>
  );
}
