import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://kmertrash.cm";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/download`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/testimonials`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/guides`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
