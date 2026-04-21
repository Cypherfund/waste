export default function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "KmerTrash",
    operatingSystem: "Android, iOS",
    applicationCategory: "UtilitiesApplication",
    description:
      "KmerTrash connects households with waste collectors in Douala, Cameroon. Schedule pickups, track collectors in real-time, and keep your community clean.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "XAF",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "4690",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Organization",
      name: "KmerTrash",
      url: "https://kmertrash.cm",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Douala",
        addressCountry: "CM",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
