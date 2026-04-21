"use client";

import Link from "next/link";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function TermsPage() {
  const { dict } = useDictionary();
  const t = dict.terms;

  return (
    <>
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
            {t.heading} <span className="text-primary-500">{t.headingHighlight}</span>
          </h1>
          <p className="mt-4 text-sm text-neutral-500">{t.lastUpdated}</p>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Summary */}
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mb-10">
            <h2 className="text-lg font-bold text-primary-700 mb-2">{t.summaryTitle}</h2>
            <p className="text-sm text-primary-600 leading-relaxed">{t.summaryText}</p>
          </div>

          <div className="prose prose-neutral max-w-none space-y-8">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s1Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s1Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s2Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s2Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s3Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s3Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s4Title}</h2>
              <ul className="mt-2 space-y-2 text-neutral-600">
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s4a}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s4b}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s4c}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s4d}</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s5Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s5Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s6Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s6Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s7Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s7Text}</p>
              <ul className="mt-2 space-y-2 text-neutral-600">
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s7a}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s7b}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-1">•</span>{t.s7c}</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s8Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s8Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s9Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">{t.s9Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t.s10Title}</h2>
              <p className="mt-2 text-neutral-600 leading-relaxed">
                {t.s10Text}{" "}
                <a href="mailto:legal@kmertrash.cm" className="text-primary-500 hover:underline">legal@kmertrash.cm</a>
                {" "}{t.s10Or}{" "}
                <Link href="/contact" className="text-primary-500 hover:underline">{t.contactPage}</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
