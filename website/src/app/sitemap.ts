import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://kmertrash.cm";
  const lastModified = new Date();
  const locales = ["en", "fr"];
  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1.0 },
    { path: "/download", changeFrequency: "monthly" as const, priority: 0.9 },
    { path: "/testimonials", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/guides", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/contact", changeFrequency: "yearly" as const, priority: 0.5 },
  ];

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${baseUrl}/${locale}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );
}
