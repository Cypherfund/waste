import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { i18n, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: Locale };
}): Promise<Metadata> {
  const isEn = params.lang === "en";
  return {
    title: isEn
      ? "KmerTrash — Smart Waste Collection for Douala"
      : "KmerTrash — Collecte intelligente des déchets pour Douala",
    description: isEn
      ? "KmerTrash connects households with waste collectors in Douala, Cameroon. Schedule pickups, track collectors in real-time, and keep your community clean."
      : "KmerTrash connecte les ménages aux collecteurs de déchets à Douala, Cameroun. Planifiez vos collectes, suivez en temps réel et gardez votre communauté propre.",
    keywords: [
      "waste collection",
      "Douala",
      "Cameroon",
      "smart city",
      "waste management",
      "recycling",
    ],
    openGraph: {
      title: isEn
        ? "KmerTrash — Smart Waste Collection for Douala"
        : "KmerTrash — Collecte intelligente des déchets pour Douala",
      description: isEn
        ? "Connect with waste collectors in Douala. Schedule pickups, track in real-time."
        : "Connectez-vous avec des collecteurs à Douala. Planifiez, suivez en temps réel.",
      type: "website",
      locale: isEn ? "en_US" : "fr_FR",
      siteName: "KmerTrash",
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang: Locale };
}>) {
  const dict = await getDictionary(params.lang);

  return (
    <>
      <Header lang={params.lang} dict={dict.common} />
      <main className="flex-1">{children}</main>
      <Footer lang={params.lang} dict={dict.common} />
      <JsonLd />
    </>
  );
}
