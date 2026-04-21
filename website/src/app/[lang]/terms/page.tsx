import type { Metadata } from "next";
import Link from "next/link";
import { Shield, FileText, AlertCircle } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { lang: Locale } }): Promise<Metadata> {
  const dict = await getDictionary(params.lang);
  return { title: dict.terms.metaTitle, description: dict.terms.metaDesc };
}

export default async function TermsPage({ params }: { params: { lang: Locale } }) {
  const dict = await getDictionary(params.lang);
  const t = dict.terms;
  const p = `/${params.lang}`;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
            {t.heading} <span className="text-primary-500">{t.headingHighlight}</span>
          </h1>
          <p className="mt-4 text-neutral-600">{t.lastUpdated}</p>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-10 bg-accent-50 border-y border-accent-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-accent-600 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{t.summaryTitle}</h2>
              <p className="mt-1 text-sm text-neutral-600 leading-relaxed">{t.summaryText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Full Terms */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-neutral max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s1Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s1Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s2Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s2Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s3Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s3Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s4Title}
              </h2>
              <ul className="mt-3 space-y-2 text-neutral-600">
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">a.</span>{t.s4a}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">b.</span>{t.s4b}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">c.</span>{t.s4c}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">d.</span>{t.s4d}</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s5Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s5Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s6Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s6Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />{t.s7Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s7Text}</p>
              <ul className="mt-3 space-y-2 text-neutral-600">
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">•</span>{t.s7a}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">•</span>{t.s7b}</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 font-bold">•</span>{t.s7c}</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s8Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s8Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s9Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.s9Text}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />{t.s10Title}
              </h2>
              <p className="mt-3 text-neutral-600 leading-relaxed">
                {t.s10Text}{" "}
                <a href="mailto:legal@kmertrash.cm" className="text-primary-500 hover:underline">legal@kmertrash.cm</a>{" "}
                {t.s10Or}{" "}
                <Link href={`${p}/contact`} className="text-primary-500 hover:underline">{t.contactPage}</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
