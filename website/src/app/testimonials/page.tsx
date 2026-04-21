"use client";

import { Star } from "lucide-react";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function TestimonialsPage() {
  const { dict } = useDictionary();
  const t = dict.testimonials;

  const testimonials = [
    { text: t.t1, name: "Marie T.", role: t.householdUser, rating: 5 },
    { text: t.t2, name: "Jean-Pierre K.", role: t.wasteCollector, rating: 5 },
    { text: t.t3, name: "Amina B.", role: t.householdUser, rating: 4 },
    { text: t.t4, name: "Paul N.", role: t.householdUser, rating: 5 },
    { text: t.t5, name: "Emmanuel D.", role: t.wasteCollector, rating: 5 },
    { text: t.t6, name: "Carine M.", role: t.householdUser, rating: 5 },
    { text: t.t7, name: "Sylvie A.", role: t.householdUser, rating: 4 },
    { text: t.t8, name: "Blaise O.", role: t.wasteCollector, rating: 5 },
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

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((tm) => (
              <div key={tm.name} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: tm.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-400 ml-auto">{tm.rating}.0</span>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed italic">&ldquo;{tm.text}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                    {tm.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{tm.name}</p>
                    <p className="text-xs text-neutral-500">{tm.role}</p>
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
