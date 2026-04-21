"use client";

import Link from "next/link";
import { useDictionary } from "@/i18n/DictionaryProvider";
import FAQSection from "@/components/FAQSection";

export default function GuidesPage() {
  const { dict } = useDictionary();
  const t = dict.guides;

  const guides = [
    { title: t.g1Title, steps: [t.g1s1, t.g1s2, t.g1s3, t.g1s4, t.g1s5] },
    { title: t.g2Title, steps: [t.g2s1, t.g2s2, t.g2s3, t.g2s4, t.g2s5] },
    { title: t.g3Title, steps: [t.g3s1, t.g3s2, t.g3s3, t.g3s4, t.g3s5] },
    { title: t.g4Title, steps: [t.g4s1, t.g4s2, t.g4s3, t.g4s4, t.g4s5] },
    { title: t.g5Title, steps: [t.g5s1, t.g5s2, t.g5s3, t.g5s4, t.g5s5] },
    { title: t.g6Title, steps: [t.g6s1, t.g6s2, t.g6s3, t.g6s4, t.g6s5] },
  ];

  const faqs = [
    { question: t.faq1q, answer: t.faq1a },
    { question: t.faq2q, answer: t.faq2a },
    { question: t.faq3q, answer: t.faq3a },
    { question: t.faq4q, answer: t.faq4a },
    { question: t.faq5q, answer: t.faq5a },
    { question: t.faq6q, answer: t.faq6a },
    { question: t.faq7q, answer: t.faq7a },
    { question: t.faq8q, answer: t.faq8a },
    { question: t.faq9q, answer: t.faq9a },
    { question: t.faq10q, answer: t.faq10a },
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

      {/* Guides */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-neutral-900 mb-8">{t.stepByStep}</h2>
          <div className="space-y-6">
            {guides.map((g) => (
              <div key={g.title} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-900 mb-4">{g.title}</h3>
                <ol className="space-y-2">
                  {g.steps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                      <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">{t.faqHeading}</h2>
          <FAQSection faqs={faqs} />
          <p className="mt-8 text-sm text-neutral-500">
            {t.faqSub}{" "}
            <Link href="/contact" className="text-primary-500 hover:underline">{t.contactUs}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
