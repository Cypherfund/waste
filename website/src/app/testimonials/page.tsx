import type { Metadata } from "next";
import { Star, Users, Quote } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/getLocale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(getLocale());
  return { title: dict.testimonials.metaTitle, description: dict.testimonials.metaDesc };
}

const names = [
  "Marie Ngoumou", "Jean-Paul Kamga", "Aisha Djibrilla", "Emmanuel Tabi",
  "Carine Mbella", "Pierre Essomba", "Fatou Bello", "Samuel Ngwa",
];
const roles = [
  "householdUser", "wasteCollector", "householdUser", "householdUser",
  "wasteCollector", "householdUser", "householdUser", "wasteCollector",
];
const locations = [
  "Akwa, Douala", "Bonabéri, Douala", "Bonapriso, Douala", "Deïdo, Douala",
  "Bassa, Douala", "Bonanjo, Douala", "Makepe, Douala", "Ndokoti, Douala",
];
const ratings = [5, 5, 5, 5, 4, 5, 5, 4];

export default async function TestimonialsPage() {
  const dict = await getDictionary(getLocale());
  const t = dict.testimonials;
  const quotes = [t.t1, t.t2, t.t3, t.t4, t.t5, t.t6, t.t7, t.t8];

  const platformRatings = [
    { platform: "Google Play", rating: "4.8", count: "2,340" },
    { platform: "App Store", rating: "4.9", count: "1,850" },
    { platform: "Trustpilot", rating: "4.7", count: "500" },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
            {t.heading} <span className="text-primary-500">{t.headingHighlight}</span> {t.headingEnd}
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">{t.subheading}</p>
        </div>
      </section>

      <section className="py-10 bg-white border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platformRatings.map((pr) => (
              <div key={pr.platform} className="flex items-center gap-4 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6 fill-accent-400 text-accent-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{pr.platform}</p>
                  <p className="text-xs text-neutral-500">{pr.rating} ★ · {pr.count} {t.reviews}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {quotes.map((quote, i) => (
              <div key={i} className="bg-neutral-50 rounded-2xl border border-neutral-100 p-6 flex flex-col">
                <Quote className="h-6 w-6 text-primary-200 mb-3" />
                <p className="text-sm text-neutral-700 italic leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{names[i]}</p>
                      <p className="text-xs text-neutral-500">
                        {roles[i] === "householdUser" ? t.householdUser : t.wasteCollector} · {locations[i]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: ratings[i] }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
